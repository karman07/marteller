import { IsBoolean, IsOptional } from 'class-validator';

export class CancelSubscriptionDto {
  // Defaults to false (cancel at the end of the current billing period,
  // matching Razorpay's own default) — set true to cancel immediately.
  @IsOptional()
  @IsBoolean()
  immediately?: boolean;
}
