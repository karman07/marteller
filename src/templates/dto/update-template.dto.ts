import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { HEADER_TYPES, WHATSAPP_CATEGORIES, type HeaderType, type WhatsappCategory } from '../schemas/template.schema';
import { TemplateButtonDto } from './template-button.dto';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(WHATSAPP_CATEGORIES)
  category?: WhatsappCategory;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsIn(HEADER_TYPES)
  headerType?: HeaderType;

  @IsOptional()
  @IsString()
  header?: string;

  @IsOptional()
  @IsString()
  headerImageUrl?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  footer?: string;

  @IsOptional()
  @IsString()
  bannerImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => TemplateButtonDto)
  buttons?: TemplateButtonDto[];
}
