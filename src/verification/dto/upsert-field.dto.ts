import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import {
  VERIFICATION_FIELD_TYPES,
  type VerificationFieldType,
} from '../schemas/verification-field.schema';

export class CreateFieldDto {
  @IsString()
  @MinLength(1)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message:
      'key must be lowercase letters, numbers, and underscores, starting with a letter',
  })
  key: string;

  @IsString()
  @MinLength(1)
  label: string;

  @IsIn(VERIFICATION_FIELD_TYPES)
  type: VerificationFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  placeholder?: string;
}

export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsIn(VERIFICATION_FIELD_TYPES)
  type?: VerificationFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  placeholder?: string;
}

export class ReorderFieldsDto {
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[];
}
