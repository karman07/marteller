import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// A prospect the sales team is working — distinct from the per-tenant `Lead`
// in leads/schemas/lead.schema.ts (that one is a customer's own CRM data
// about their end customers). This is Marteller's own sales pipeline for
// turning outreach into signed-up accounts.
export type SalesLeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'demo_scheduled'
  | 'negotiating'
  | 'converted'
  | 'lost';

export const SALES_LEAD_STATUSES: SalesLeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'demo_scheduled',
  'negotiating',
  'converted',
  'lost',
];

export type SalesLeadDocument = HydratedDocument<SalesLead>;

@Schema({ timestamps: true })
export class SalesLead {
  @Prop({ required: true })
  name: string;

  @Prop()
  companyName?: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  source?: string;

  @Prop()
  notes?: string;

  @Prop({ enum: SALES_LEAD_STATUSES, default: 'new', index: true })
  status: SalesLeadStatus;

  // Set once promoted to a real account — the honest link between "we
  // signed them up" and the actual user record, not just a status flip.
  @Prop()
  convertedUserId?: string;

  // The sales rep currently working this lead — a User with role 'sales'
  // (not enforced at the schema level; the assign-to picker on both the
  // admin and sales apps only ever offers sales-role users). Left unset
  // means the lead sits in the shared, unassigned pool.
  @Prop({ index: true })
  assignedToUserId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const SalesLeadSchema = SchemaFactory.createForClass(SalesLead);
