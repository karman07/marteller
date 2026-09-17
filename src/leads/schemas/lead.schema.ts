import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { Channel } from '../../templates/schemas/template.schema';

export type LeadStatus =
  'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'converted',
  'lost',
];

export type LeadDocument = HydratedDocument<Lead>;

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  // Which channel this prospect first came in on — set automatically when a
  // lead is promoted from a message log, chosen manually otherwise.
  @Prop()
  channel?: Channel;

  @Prop({ enum: LEAD_STATUSES, default: 'new', index: true })
  status: LeadStatus;

  @Prop()
  notes?: string;

  // Set when this lead was promoted from an existing contact or message log,
  // so the pipeline card can link back to where it came from.
  @Prop()
  contactId?: string;

  @Prop()
  sourceMessageId?: string;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
