import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TransactionType = 'credit' | 'debit';
export type WalletTransactionDocument = HydratedDocument<WalletTransaction>;

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ enum: ['credit', 'debit'], required: true })
  type: TransactionType;

  @Prop({ required: true })
  amountPaise: number;

  @Prop({ required: true })
  description: string;

  @Prop()
  relatedMessageId?: string;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);
