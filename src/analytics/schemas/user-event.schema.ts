import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserEventApp = 'frontend' | 'sales' | 'admin';
export type UserEventType =
  | 'page_view'
  | 'click'
  | 'feature_interest'
  | 'funnel_step'
  | 'custom';

export type UserEventDocument = HydratedDocument<UserEvent>;

// Behavior-tracking timeline — what a visitor/user clicked, viewed, showed
// interest in, and whether they completed the signup/verification/checkout
// funnel. Shaped after mail/schemas/email-event.schema.ts's append-only
// "enum type + timestamps + metadata" pattern. userId is optional because
// pre-auth marketing-site visitors are tracked too (see anonymousId) —
// events get "claimed" (userId backfilled) once that anonymousId's first
// authenticated event arrives, see AnalyticsService.track().
@Schema({ timestamps: true })
export class UserEvent {
  @Prop({ index: true })
  userId?: string;

  @Prop({ required: true, index: true })
  anonymousId: string;

  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ enum: ['frontend', 'sales', 'admin'], required: true })
  app: UserEventApp;

  @Prop({
    enum: ['page_view', 'click', 'feature_interest', 'funnel_step', 'custom'],
    required: true,
  })
  type: UserEventType;

  // Freeform but conventionally namespaced, e.g. 'page_view',
  // 'pricing_view', 'feature_click:workflows', 'signup_started',
  // 'signup_completed', 'verification_submitted', 'checkout_started',
  // 'checkout_completed' — indexed for funnel aggregation by name.
  @Prop({ required: true, index: true })
  name: string;

  @Prop()
  path?: string;

  @Prop()
  referrer?: string;

  @Prop({ type: Object })
  utm?: { source?: string; medium?: string; campaign?: string };

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

export const UserEventSchema = SchemaFactory.createForClass(UserEvent);
UserEventSchema.index({ userId: 1, createdAt: -1 });
UserEventSchema.index({ anonymousId: 1, createdAt: -1 });
UserEventSchema.index({ name: 1, createdAt: -1 });
