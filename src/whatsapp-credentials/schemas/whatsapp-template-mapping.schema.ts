import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TemplateApprovalStatus = 'pending' | 'approved' | 'rejected';
export const TEMPLATE_APPROVAL_STATUSES: TemplateApprovalStatus[] = [
  'pending',
  'approved',
  'rejected',
];

export type WhatsAppTemplateMappingDocument = HydratedDocument<WhatsAppTemplateMapping>;

// Per-tenant approval record for our own Template._id. Our provider
// requires a template to be registered and approved on its side before it
// can be sent, and that registration happens per-tenant (a shared/isSystem
// template has no single correct provider id, since every tenant's own
// account registers "the same" template separately). Deliberately NOT a
// field on Template itself for that reason.
//
// This is staff-handled, not tenant self-service, same model already used
// for WhatsAppCredential: a tenant creating/using a WhatsApp template just
// sees a status (pending/approved/rejected) and never touches a provider
// or an id — sales/admin pick it up from the approvals queue
// (WhatsAppTemplateMappingService.listPendingQueue, surfaced via
// SalesService) and resolve it on the tenant's behalf.
@Schema({ timestamps: true })
export class WhatsAppTemplateMapping {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  templateId: string;

  @Prop({ enum: TEMPLATE_APPROVAL_STATUSES, default: 'pending', index: true })
  status: TemplateApprovalStatus;

  // Only set once approved — the id the send provider references. Never
  // returned to the tenant, only read internally by the send path.
  @Prop()
  providerMessageId?: string;

  // Set once WhatsAppTemplateSubmissionService successfully registers the
  // template with the provider — the id it uses to poll for approval.
  // Left unset when auto-submission wasn't possible (no WABA id on the
  // credential yet, an image header, or the call failed), which is what
  // keeps this row in the staff manual queue as a fallback.
  @Prop()
  providerTemplateId?: string;

  // Stamped the first time auto-submission is attempted, success or not —
  // prevents re-submitting on every subsequent page view/listing call.
  @Prop()
  submissionAttemptedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop()
  reviewedByUserId?: string;

  @Prop()
  reviewedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const WhatsAppTemplateMappingSchema = SchemaFactory.createForClass(WhatsAppTemplateMapping);
WhatsAppTemplateMappingSchema.index({ userId: 1, templateId: 1 }, { unique: true });
