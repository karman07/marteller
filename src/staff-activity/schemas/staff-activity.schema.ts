import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StaffActivityDocument = HydratedDocument<StaffActivity>;

// A running feed of consequential actions sales reps and admins take —
// lets admin actually see what the sales team is doing (lead work,
// verification decisions, credentials issued, balances added) instead of
// having to infer it from the underlying records. Deliberately not a
// full audit log of every read/write — only actions with a real, visible
// effect get logged (see StaffActivityService.log()'s call sites).
@Schema({ timestamps: true })
export class StaffActivity {
  @Prop({ required: true, index: true })
  staffUserId: string;

  @Prop({ required: true })
  staffName: string;

  @Prop({ enum: ['admin', 'sales'], required: true, index: true })
  staffRole: 'admin' | 'sales';

  // Machine-readable, e.g. 'lead_created', 'verification_reviewed' — for
  // future filtering; the UI reads `summary` for display.
  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  summary: string;

  @Prop()
  targetUserId?: string;

  @Prop()
  targetLeadId?: string;

  createdAt: Date;
}

export const StaffActivitySchema = SchemaFactory.createForClass(StaffActivity);
StaffActivitySchema.index({ createdAt: -1 });
