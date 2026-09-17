import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalesLead, SalesLeadDocument } from './schemas/sales-lead.schema';
import {
  CreateSalesLeadDto,
  PromoteLeadDto,
  UpdateSalesLeadDto,
} from './dto/sales-lead.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { generateTempPassword } from '../common/generate-temp-password';

@Injectable()
export class SalesLeadsService {
  constructor(
    @InjectModel(SalesLead.name)
    private readonly model: Model<SalesLeadDocument>,
    private readonly firebase: FirebaseService,
    private readonly usersService: UsersService,
  ) {}

  list() {
    return this.model.find().sort({ createdAt: -1 }).limit(1000).exec();
  }

  create(dto: CreateSalesLeadDto) {
    return this.model.create(dto);
  }

  async update(id: string, dto: UpdateSalesLeadDto) {
    const lead = await this.model
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async remove(id: string) {
    const res = await this.model.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Lead not found');
    return { deleted: true };
  }

  // Starts turning a prospect into a real account — provisions the
  // Firebase+Mongo User (needed as an attachment point for verification
  // documents) but deliberately does NOT hand out usable credentials yet:
  // the lead moves to 'pending_verification', not 'converted', and stays
  // there until the linked user's business verification is reviewed and
  // approved (SalesService.reviewVerification flips it — see that
  // method). The password Firebase is given here is internal only, never
  // returned to the caller; see issueCredentials() for the real handoff.
  async promote(id: string, dto: PromoteLeadDto) {
    const lead = await this.model.findById(id).exec();
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.convertedUserId) {
      throw new BadRequestException(
        'This lead has already been moved to verification or converted',
      );
    }

    const email = dto.email ?? lead.email;
    if (!email) {
      throw new BadRequestException(
        'Add an email for this lead before promoting them',
      );
    }

    let uid: string;
    try {
      const existing = await this.firebase.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const created = await this.firebase.createUser(email, generateTempPassword());
      uid = created.uid;
    }

    let user = await this.usersService.findByFirebaseUid(uid);
    if (!user) {
      user = await this.usersService.createFromToken(uid, {
        email,
        emailVerified: true,
      });
    }
    if (lead.name || lead.companyName) {
      await this.usersService.updateProfile(user.id, {
        name: lead.name,
        companyName: lead.companyName,
      });
    }

    lead.status = 'pending_verification';
    lead.convertedUserId = user.id;
    await lead.save();

    return { lead, email, userId: user.id };
  }

  // The actual credential handoff — deliberately a separate action from
  // promote(), only reachable once verification has moved the lead to
  // 'converted' (see SalesService.reviewVerification). Both sales and
  // admin can call this (routed through SalesLeadsController AND
  // AdminController), matching the "either side can create the customer's
  // creds once verified" requirement. Issues a fresh password each call —
  // there's no email/SMS delivery wired up, so whoever calls this passes
  // it along to the customer themselves.
  async issueCredentials(id: string) {
    const lead = await this.model.findById(id).exec();
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status !== 'converted' || !lead.convertedUserId) {
      throw new BadRequestException(
        'This lead is not verified yet — credentials can only be issued once verification is approved.',
      );
    }

    const user = await this.usersService.findById(lead.convertedUserId);
    if (!user) throw new NotFoundException('Linked user account not found');

    const temporaryPassword = generateTempPassword();
    await this.firebase.updatePassword(user.firebaseUid, temporaryPassword);

    return { email: user.email, temporaryPassword, userId: user.id };
  }

  // Called by SalesService.reviewVerification once a review sets a user's
  // verification to 'verified' — flips the matching lead (if any) from
  // 'pending_verification' to 'converted'. A no-op for users who didn't
  // come through the sales-lead pipeline (self-signups), since there's no
  // matching lead to find.
  async markConvertedIfPendingVerification(userId: string) {
    await this.model
      .updateOne(
        { convertedUserId: userId, status: 'pending_verification' },
        { status: 'converted' },
      )
      .exec();
  }
}
