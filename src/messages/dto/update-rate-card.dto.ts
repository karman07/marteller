import { IsInt, IsOptional, Min } from 'class-validator';

// Every field optional — admin can override just the channel(s) they
// care about in one call. 0 is a valid value (a free channel), so these
// use Min(0)/Min(1) rather than treating a falsy value as "not provided".
export class UpdateRateCardDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  whatsappMarketingPaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  whatsappUtilityPaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  whatsappAuthenticationPaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  emailPaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  smsPerSegmentPaise?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  smsSegmentLength?: number;
}
