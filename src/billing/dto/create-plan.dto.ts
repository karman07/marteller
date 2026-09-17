import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

class MessageLimitsDto {
  @IsInt()
  @Min(0)
  whatsapp: number;

  @IsInt()
  @Min(0)
  email: number;

  @IsInt()
  @Min(0)
  sms: number;
}

export class CreatePlanDto {
  @IsString()
  name: string;

  // DNS-label-safe-ish, matches the convention used elsewhere in this
  // codebase (e.g. mail-domains.service.ts's DKIM selector) for a
  // human-editable but URL/route-safe identifier.
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  priceMonthlyPaise: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @ValidateNested()
  @Type(() => MessageLimitsDto)
  messageLimits: MessageLimitsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
