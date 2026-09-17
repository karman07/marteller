import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
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

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthlyPaise?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MessageLimitsDto)
  messageLimits?: MessageLimitsDto;

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
