import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  CHANNELS,
  HEADER_TYPES,
  WHATSAPP_CATEGORIES,
  type Channel,
  type HeaderType,
  type WhatsappCategory,
} from '../schemas/template.schema';
import { TemplateButtonDto } from './template-button.dto';

export class CreateTemplateDto {
  @IsIn(CHANNELS)
  channel: Channel;

  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateIf((dto: CreateTemplateDto) => dto.channel === 'whatsapp')
  @IsIn(WHATSAPP_CATEGORIES)
  category?: WhatsappCategory;

  @IsOptional()
  @IsString()
  language?: string;

  @ValidateIf((dto: CreateTemplateDto) => dto.channel === 'email')
  @IsString()
  @IsNotEmpty()
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

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsString()
  footer?: string;

  @IsOptional()
  @IsString()
  bannerImageUrl?: string;

  @ValidateIf((dto: CreateTemplateDto) => dto.channel === 'whatsapp')
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => TemplateButtonDto)
  buttons?: TemplateButtonDto[];
}
