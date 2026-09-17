import { IsIn, IsNotEmpty, IsString, IsUrl, Matches, MaxLength, ValidateIf } from 'class-validator';
import { TEMPLATE_BUTTON_TYPES, type TemplateButtonType } from '../schemas/template.schema';

export class TemplateButtonDto {
  @IsIn(TEMPLATE_BUTTON_TYPES)
  type: TemplateButtonType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  text: string;

  @ValidateIf((b: TemplateButtonDto) => b.type === 'phone_number')
  @IsNotEmpty({ message: 'Enter a phone number for this button' })
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in international format, e.g. +911234567890',
  })
  phoneNumber?: string;

  @ValidateIf((b: TemplateButtonDto) => b.type === 'url')
  @IsNotEmpty({ message: 'Enter a URL for this button' })
  @IsUrl({}, { message: 'Enter a valid URL' })
  @MaxLength(2000)
  url?: string;
}
