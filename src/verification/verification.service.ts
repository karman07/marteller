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
  ) {}

  async findByUserId(userId: string) {
    const record = await this.model.findOne({ userId }).exec();
    return (
      record ?? {
        userId,
        status: 'not_submitted' as const,
        documents: [],
        fieldValues: {},
      }
    );
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

  async submit(
    userId: string,
    fieldValues: Record<string, string>,
    documents: VerificationDocument[],
  ) {
    const fields = await this.listFields();
    for (const field of fields) {
      if (field.required && !fieldValues[field.key]?.trim()) {
        throw new BadRequestException(`"${field.label}" is required`);
      }
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

  // The real review action — gated by SalesGuard at the controller level,
  // not the dev bypass. This is what actually lets a verification move past
  // "pending" once there's a sales team to do the reviewing.
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
    return record;
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
