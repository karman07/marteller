import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { VerificationService } from '../verification/verification.service';
import { WalletService } from '../wallet/wallet.service';
import { LeadsService } from '../leads/leads.service';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { SalesStage } from '../users/schemas/user.schema';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { SalesLeadsService } from './sales-leads.service';
import { VerificationDocument } from '../verification/schemas/business-verification.schema';
import {
  CreateFieldDto,
  UpdateFieldDto,
} from '../verification/dto/upsert-field.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly usersService: UsersService,
    private readonly verificationService: VerificationService,
    private readonly walletService: WalletService,
    private readonly leadsService: LeadsService,
    private readonly salesLeadsService: SalesLeadsService,
    // Direct model access, same reasoning as elsewhere in this codebase —
    // reading a usage summary doesn't need the full MessagesModule
    // (wallet/verification/provider wiring it pulls in for sending).
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  // The single, unified pipeline: everyone sales is working, whether
  // they're still a pre-account lead or already a real customer, shown
  // as one list sharing one set of stages (SalesStage/SalesLeadStatus are
  // kept identical in shape for exactly this reason). A promoted lead
  // stops appearing as a lead entry the moment it has a convertedUserId —
  // from then on it's represented purely by its linked customer entry,
  // so nobody ever sees the same person twice across two disconnected
  // boards (which is exactly what "Leads" + "Applicants" used to do).
  async listPipeline() {
    const [leads, users] = await Promise.all([
      this.salesLeadsService.list(),
      this.usersService.listCustomers(),
    ]);

    const verifications = await Promise.all(
      users.map((u) => this.verificationService.findByUserId(u.id)),
    );

    const leadEntries = leads
      .filter((l) => !l.convertedUserId)
      .map((l) => ({
        kind: 'lead' as const,
        id: (l._id as { toString(): string }).toString(),
        name: l.name,
        companyName: l.companyName ?? null,
        email: l.email ?? null,
        phone: l.phone ?? null,
        source: l.source ?? null,
        notes: l.notes ?? null,
        stage: l.status,
        assignedToUserId: l.assignedToUserId ?? null,
        verificationStatus: null,
        createdAt: l.createdAt,
      }));

    const customerEntries = users.map((u, i) => ({
      kind: 'customer' as const,
      id: u.id,
      name: u.name || u.companyName || u.email || u.phoneNumber || 'Unnamed signup',
      companyName: u.companyName ?? null,
      email: u.email ?? null,
      phone: u.phoneNumber ?? null,
      source: null,
      notes: null,
      stage: u.salesStage,
      assignedToUserId: null,
      verificationStatus: verifications[i].status,
      createdAt: u.createdAt,
    }));

    return [...leadEntries, ...customerEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async listApplicants() {
    const users = await this.usersService.listCustomers();
    const verifications = await Promise.all(
      users.map((u) => this.verificationService.findByUserId(u.id)),
    );

    const items = users.map((u, i) => {
      const v = verifications[i];
      return {
        userId: u.id,
        name:
          u.name ||
          u.companyName ||
          u.email ||
          u.phoneNumber ||
          'Unnamed signup',
        email: u.email ?? null,
        phoneNumber: u.phoneNumber ?? null,
        companyName: u.companyName ?? null,
        accountType: u.accountType ?? null,
        verificationStatus: v.status,
        submittedAt: 'submittedAt' in v ? (v.submittedAt ?? null) : null,
        salesStage: u.salesStage,
        createdAt: u.createdAt,
      };
    });

    return { items, isDummyData: false };
  }

  async stats() {
    const users = await this.usersService.listCustomers();
    const verifications = await Promise.all(
      users.map((u) => this.verificationService.findByUserId(u.id)),
    );

    const byVerification: Record<string, number> = {
      not_submitted: 0,
      pending: 0,
      verified: 0,
      rejected: 0,
    };
    for (const v of verifications) byVerification[v.status] += 1;

    const byStage: Record<SalesStage, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      negotiating: 0,
      pending_verification: 0,
      converted: 0,
      lost: 0,
    };
    for (const u of users) byStage[u.salesStage] += 1;

    return {
      totalSignups: users.length,
      byVerification,
      byStage,
      isDummyData: false,
    };
  }

  async getApplicant(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Applicant not found');
    const verification = await this.verificationService.findByUserId(userId);
    return {
      user: {
        userId: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber ?? null,
        photoUrl: user.photoUrl ?? null,
        companyName: user.companyName ?? null,
        companySize: user.companySize ?? null,
        accountType: user.accountType ?? null,
        address: user.address ?? null,
        city: user.city ?? null,
        state: user.state ?? null,
        postalCode: user.postalCode ?? null,
        country: user.country ?? null,
        countryDialCode: user.countryDialCode ?? null,
        interests: user.interests ?? [],
        onboarded: user.onboarded,
        walletBalancePaise: user.walletBalancePaise,
        salesStage: user.salesStage,
        salesNotes: user.salesNotes ?? null,
        createdAt: user.createdAt,
      },
      verification,
    };
  }

  async getUsage(userId: string) {
    const [byChannel, byStatus, total, wallet, leads] = await Promise.all([
      this.messageModel.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$channel',
            count: { $sum: 1 },
            costPaise: { $sum: '$costPaise' },
          },
        },
      ]),
      this.messageModel.aggregate([
        { $match: { userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.messageModel.countDocuments({ userId }).exec(),
      this.walletService.getBalance(userId),
      this.leadsService.list(userId),
    ]);

    return {
      totalMessages: total,
      byChannel: byChannel.map(
        (r: { _id: string; count: number; costPaise: number }) => ({
          channel: r._id,
          count: r.count,
          costPaise: r.costPaise,
        }),
      ),
      byStatus: byStatus.map((r: { _id: string; count: number }) => ({
        status: r._id,
        count: r.count,
      })),
      walletBalancePaise: wallet.balancePaise,
      leadsCount: leads.length,
    };
  }

  async reviewVerification(userId: string, dto: ReviewApplicationDto) {
    const record = await this.verificationService.review(
      userId,
      dto.status,
      dto.reviewNote,
    );

    // Approving verification is what actually moves someone to
    // 'converted' in the unified pipeline (see listPipeline()) — for both
    // a lead-originated user (whose SalesLead also needs its own status
    // flipped, since it's a separate record — see
    // SalesLeadsService.promote()'s comment) and a self-signup (who has
    // no SalesLead at all, just this one salesStage field).
    if (dto.status === 'verified') {
      await this.salesLeadsService.markConvertedIfPendingVerification(userId);
      await this.usersService.updateSalesStage(userId, 'converted');
    }

    return record;
  }

  // Lets sales/admin upload verification documents (and optionally field
  // values) for an applicant who can't self-serve yet — most commonly a
  // freshly-promoted sales lead still sitting in 'pending_verification',
  // but works for any applicant. Goes through the exact same
  // VerificationService.submit() the applicant's own self-upload uses, so
  // both paths land in the same record and admin/sales see them uniformly
  // regardless of who uploaded.
  submitVerificationOnBehalf(
    userId: string,
    fieldValues: Record<string, string>,
    documents: VerificationDocument[],
  ) {
    return this.verificationService.submit(userId, fieldValues, documents);
  }

  async updateStage(userId: string, dto: UpdateStageDto) {
    const user = await this.usersService.updateSalesStage(
      userId,
      dto.salesStage,
      dto.salesNotes,
    );
    if (!user) throw new NotFoundException('Applicant not found');
    return user;
  }

  async getDocument(userId: string, storedFileName: string) {
    return this.verificationService.findDocument(userId, storedFileName);
  }

  listFormFields() {
    return this.verificationService.listFields();
  }

  createFormField(dto: CreateFieldDto) {
    return this.verificationService.createField(dto);
  }

  updateFormField(id: string, dto: UpdateFieldDto) {
    return this.verificationService.updateField(id, dto);
  }

  deleteFormField(id: string) {
    return this.verificationService.deleteField(id);
  }

  reorderFormFields(orderedIds: string[]) {
    return this.verificationService.reorderFields(orderedIds);
  }
}
