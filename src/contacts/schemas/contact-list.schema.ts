import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContactListDocument = HydratedDocument<ContactList>;

@Schema({ timestamps: true })
export class ContactList {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  name: string;
}

export const ContactListSchema = SchemaFactory.createForClass(ContactList);
ContactListSchema.index({ userId: 1, name: 1 }, { unique: true });
