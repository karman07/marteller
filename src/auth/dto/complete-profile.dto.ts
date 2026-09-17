import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import {
  COMPANY_SIZES,
  INTERESTS,
  type AccountType,
  type CompanySize,
  type Interest,
} from '../../users/schemas/user.schema';

export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsIn(['individual', 'business'])
  accountType?: AccountType;

  @ValidateIf((dto: CompleteProfileDto) => dto.accountType === 'business')
  @IsString()
  @IsNotEmpty()
  companyName?: string;

  @ValidateIf((dto: CompleteProfileDto) => dto.accountType === 'business')
  @IsIn(COMPANY_SIZES)
  companySize?: CompanySize;

  @IsOptional()
  @IsArray()
  @IsIn(INTERESTS, { each: true })
  interests?: Interest[];

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  countryIso2?: string;

  @IsOptional()
  @IsString()
  countryDialCode?: string;
}
