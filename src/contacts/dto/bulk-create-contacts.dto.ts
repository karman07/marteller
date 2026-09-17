import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

// Deliberately lenient (unlike CreateContactDto) — a bulk CSV/Excel import
// will have occasional messy rows, and we want to skip those individually
// in the service rather than reject the whole batch on one bad row.
class BulkContactRowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkCreateContactsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => BulkContactRowDto)
  contacts: BulkContactRowDto[];

  @IsOptional()
  @IsString()
  list?: string;
}
