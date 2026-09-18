import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BusinessVerification,
  BusinessVerificationDocument,
  VerificationDocument,
} from './schemas/business-verification.schema';
import {
  VerificationFieldDef,
  VerificationFieldDefDocument,
} from './schemas/verification-field.schema';
import { DevReviewDto } from './dto/dev-review.dto';
import { CreateFieldDto, UpdateFieldDto } from './dto/upsert-field.dto';
import { UsersService } from '../users/users.service';
import { SystemMailService } from '../mail-core/system-mail.service';

// The starting form — seeded once when no fields exist yet, so submissions
// keep working out of the box. The sales team can edit/remove/add to this
// freely afterward; nothing else in the app depends on these specific keys.
const DEFAULT_FIELDS: CreateFieldDto[] = [
  {
    key: 'business_name',
    label: 'Business name',
    type: 'text',
    required: true,
  },
  {
    key: 'business_type',
    label: 'Business type',
    type: 'select',
    required: true,
    options: [
      'individual',
      'proprietorship',
      'partnership',
      'llp',
      'private_limited',
      'other',
    ],
  },
  {
    key: 'gstin',
    label: 'GSTIN',
    type: 'text',
    required: false,
    placeholder: 'Optional',
  },
  {
    key: 'registration_number',
    label: 'Registration / PAN number',
    type: 'text',
    required: false,
    placeholder: 'Optional',
  },
];

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel(BusinessVerification.name)
    private readonly model: Model<BusinessVerificationDocument>,
    @InjectModel(VerificationFieldDef.name)
    private readonly fieldModel: Model<VerificationFieldDefDocument>,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly systemMailService: SystemMailService,
  ) {}

  async findByUserId(userId: string) {
    const record = await this.model.findOne({ userId }).exec();
    if (!record) {
      return {
        userId,
        status: 'not_submitted' as const,
        documents: [],
        fieldValues: {},
      };
    }
    // Defends against records from before `fieldValues` existed on this
    // schema (older submissions stored fields as flat top-level props) —
    // doesn't persist, just guarantees every caller gets an object here.
    if (!record.fieldValues) record.fieldValues = {};
    return record;
  }

  async listFields() {
    const existing = await this.fieldModel.find().sort({ order: 1 }).exec();
    if (existing.length > 0) return existing;
    const seeded = await this.fieldModel.insertMany(
      DEFAULT_FIELDS.map((f, i) => ({
        ...f,
        required: f.required ?? true,
        order: i,
      })),
    );
    return seeded;
  }

  async createField(dto: CreateFieldDto) {
    const existing = await this.fieldModel.findOne({ key: dto.key }).exec();
    if (existing)
      throw new BadRequestException(
        `A field with key "${dto.key}" already exists`,
      );
    const count = await this.fieldModel.countDocuments().exec();
    return this.fieldModel.create({ ...dto, order: count });
  }

  async updateField(id: string, dto: UpdateFieldDto) {
    const field = await this.fieldModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!field) throw new NotFoundException('Field not found');
    return field;
  }

  async deleteField(id: string) {
    const res = await this.fieldModel.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Field not found');
    return { deleted: true };
  }

  async reorderFields(orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, order) =>
        this.fieldModel.updateOne({ _id: id }, { order }).exec(),
      ),
    );
    return this.listFields();
  }

  // `newDocuments` only needs to carry whatever was uploaded THIS call — it
  // is merged by `type` onto whatever documents already exist for this
  // user, so re-submitting after a rejection (or an admin/sales upload
  // filling in the other slot) never silently drops a document that was
  // already there. Both the customer's own self-submit
  // (VerificationController) and the sales/admin "upload on behalf of this
  // applicant" routes funnel through here for exactly that reason.
  async submit(
    userId: string,
    newFieldValues: Record<string, string>,
    newDocuments: VerificationDocument[],
  ) {
    const existing = await this.model.findOne({ userId }).exec();
    const fieldValues = { ...(existing?.fieldValues ?? {}), ...newFieldValues };

    const fields = await this.listFields();
    for (const field of fields) {
      if (field.required && !fieldValues[field.key]?.trim()) {
        throw new BadRequestException(`"${field.label}" is required`);
      }
    }

    const documentsByType = new Map(
      (existing?.documents ?? []).map((doc) => [doc.type, doc]),
    );
    for (const doc of newDocuments) {
      documentsByType.set(doc.type, doc);
    }
    const documents = Array.from(documentsByType.values());

    const hasBusinessProof = documents.some((d) => d.type === 'businessProof');
    const hasAddressProof = documents.some((d) => d.type === 'addressProof');
    if (!hasBusinessProof || !hasAddressProof) {
      throw new BadRequestException(
        'Both a business proof and an address proof document are required before submitting for verification.',
      );
    }

    return this.model
      .findOneAndUpdate(
        { userId },
        {
          userId,
          fieldValues,
          documents,
          status: 'pending',
          submittedAt: new Date(),
          reviewNote: undefined,
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  private isDevBypassEnabled(): boolean {
    return (
      this.config.get<string>('NODE_ENV') !== 'production' &&
      this.config.get<string>('DEV_PHONE_AUTH_BYPASS') === 'true'
    );
  }

  // The real review action — gated by SalesGuard/AdminGuard at the
  // controller level, not the dev bypass. This is what actually lets a
  // verification move past "pending" once there's a sales/admin team to
  // do the reviewing, and unlocks the dashboard (see VerificationGate on
  // the frontend — it blocks until status === 'verified').
  async review(
    userId: string,
    status: 'verified' | 'rejected',
    reviewNote?: string,
  ) {
    const record = await this.model
      .findOneAndUpdate(
        { userId },
        { status, reviewNote, reviewedAt: new Date() },
        { new: true },
      )
      .exec();
    if (!record) {
      throw new NotFoundException(
        'No verification submission found for this user',
      );
    }

    // Never let a notification failure roll back or mask the status change
    // that already succeeded above — this is best-effort, logged inside
    // SystemMailService itself.
    await this.notifyReviewOutcome(userId, status, reviewNote);

    return record;
  }

  private async notifyReviewOutcome(
    userId: string,
    status: 'verified' | 'rejected',
    reviewNote?: string,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user?.email) return;

    const name = user.name ?? 'there';
    if (status === 'verified') {
      await this.systemMailService.send({
        to: user.email,
        template: 'verification_approved',
        subject: 'Your Marteller account is verified',
        text: `Hi ${name},\n\nYour business verification has been approved — your dashboard is now unlocked and you can start sending WhatsApp, Email, and SMS messages.\n\n— Marteller`,
        html: `<p>Hi ${name},</p><p>Your business verification has been approved — your dashboard is now unlocked and you can start sending WhatsApp, Email, and SMS messages.</p><p>— Marteller</p>`,
      });
    } else {
      const noteHtml = reviewNote
        ? `<p><strong>Reviewer note:</strong> ${reviewNote}</p>`
        : '';
      const noteText = reviewNote ? `\nReviewer note: ${reviewNote}\n` : '';
      await this.systemMailService.send({
        to: user.email,
        template: 'verification_rejected',
        subject: 'Action needed: your Marteller verification was rejected',
        text: `Hi ${name},\n\nYour business verification was rejected. Please update your details and resubmit from your dashboard.\n${noteText}\n— Marteller`,
        html: `<p>Hi ${name},</p><p>Your business verification was rejected. Please update your details and resubmit from your dashboard.</p>${noteHtml}<p>— Marteller</p>`,
      });
    }
  }

  async devReview(userId: string, dto: DevReviewDto) {
    if (!this.isDevBypassEnabled()) {
      throw new ForbiddenException('Dev review is disabled');
    }

    const record = await this.model
      .findOneAndUpdate(
        { userId },
        {
          status: dto.status,
          reviewNote: dto.reviewNote,
          reviewedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!record)
      throw new NotFoundException(
        'No verification submission found for this user',
      );
    return record;
  }

  async findDocument(userId: string, storedFileName: string) {
    const record = await this.model.findOne({ userId }).exec();
    const doc = record?.documents.find(
      (d) => d.storedFileName === storedFileName,
    );
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }
}
