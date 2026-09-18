import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RateCardDocument = HydratedDocument<RateCard>;

// A singleton — exactly one document ever exists (PricingService always
// queries with no filter). Admin-editable per-channel pricing, separate
// from a Plan's monthly platform fee: this is what a message actually
// costs against the wallet once any plan allowance is exhausted. Any rate
// can be set to 0 to make a channel free. Rates apply going forward only
// — sent messages already persist their own costPaise, so changing a
// rate here never rewrites billing history.
@Schema({ timestamps: true })
export class RateCard {
  @Prop({ default: 88 })
  whatsappMarketingPaise: number;

  @Prop({ default: 35 })
  whatsappUtilityPaise: number;

  @Prop({ default: 35 })
  whatsappAuthenticationPaise: number;

  @Prop({ default: 10 })
  emailPaise: number;

  @Prop({ default: 18 })
  smsPerSegmentPaise: number;

  @Prop({ default: 160 })
  smsSegmentLength: number;

  createdAt: Date;
  updatedAt: Date;
}

export const RateCardSchema = SchemaFactory.createForClass(RateCard);
