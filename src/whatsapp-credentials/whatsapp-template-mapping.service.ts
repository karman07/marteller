import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WhatsAppTemplateMapping,
  WhatsAppTemplateMappingDocument,
} from './schemas/whatsapp-template-mapping.schema';

@Injectable()
export class WhatsAppTemplateMappingService {
  constructor(
    @InjectModel(WhatsAppTemplateMapping.name)
    private readonly model: Model<WhatsAppTemplateMappingDocument>,
  ) {}

  getMapping(userId: string, templateId: string) {
    return this.model.findOne({ userId, templateId }).exec();
  }

  // Creates the pending record the first time a tenant's WhatsApp template
  // needs one (on create, or the first time they view a shared template) —
  // a no-op if one already exists, so it never resets a status staff have
  // since reviewed.
  ensurePending(userId: string, templateId: string) {
    return this.model
      .findOneAndUpdate(
        { userId, templateId },
        { $setOnInsert: { userId, templateId, status: 'pending' } },
        { upsert: true, new: true },
      )
      .exec();
  }

  // One round trip for the whole template list — the frontend overlays
  // this onto every WhatsApp template it renders rather than fetching per
  // row. Only status + rejection reason go to the tenant; providerMessageId
  // is an internal detail of the send path.
  async listStatusesForUser(
    userId: string,
  ): Promise<Record<string, { status: string; rejectionReason: string | null }>> {
    const rows = await this.model.find({ userId }).exec();
    return Object.fromEntries(
      rows.map((r) => [
        r.templateId,
        { status: r.status, rejectionReason: r.rejectionReason ?? null },
      ]),
    );
  }

  // The staff-facing queue — every tenant's pending template, oldest first,
  // enriched with tenant/template details by SalesService (this service
  // only knows mapping rows). Includes auto-submitted rows too (so staff
  // can see they're in flight), distinguished by providerTemplateId.
  listPendingQueue() {
    return this.model.find({ status: 'pending' }).sort({ createdAt: 1 }).exec();
  }

  // Rows WhatsAppTemplateSubmissionService successfully registered with
  // the provider and is now polling for an approval decision.
  listAutoSubmitted() {
    return this.model
      .find({ status: 'pending', providerTemplateId: { $exists: true, $ne: null } })
      .exec();
  }

  markSubmissionAttempted(userId: string, templateId: string) {
    return this.model
      .updateOne({ userId, templateId }, { $set: { submissionAttemptedAt: new Date() } })
      .exec();
  }

  setProviderTemplateId(userId: string, templateId: string, providerTemplateId: string) {
    return this.model
      .updateOne({ userId, templateId }, { $set: { providerTemplateId } })
      .exec();
  }

  approve(userId: string, templateId: string, providerMessageId: string, reviewedByUserId: string) {
    return this.model
      .findOneAndUpdate(
        { userId, templateId },
        {
          $set: {
            status: 'approved',
            providerMessageId,
            reviewedByUserId,
            reviewedAt: new Date(),
          },
          $unset: { rejectionReason: 1 },
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  reject(userId: string, templateId: string, reason: string, reviewedByUserId: string) {
    return this.model
      .findOneAndUpdate(
        { userId, templateId },
        {
          $set: {
            status: 'rejected',
            rejectionReason: reason,
            reviewedByUserId,
            reviewedAt: new Date(),
          },
          $unset: { providerMessageId: 1 },
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async removeMapping(userId: string, templateId: string) {
    await this.model.deleteOne({ userId, templateId }).exec();
    return { deleted: true };
  }
}
