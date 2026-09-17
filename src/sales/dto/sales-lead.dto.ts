import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  SALES_LEAD_STATUSES,
  type SalesLeadStatus,
} from '../schemas/sales-lead.schema';

export class CreateSalesLeadDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSalesLeadDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(SALES_LEAD_STATUSES)
  status?: SalesLeadStatus;
}

export class PromoteLeadDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}
