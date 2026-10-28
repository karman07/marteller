import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertWhatsAppCredentialDto {
  @IsString()
  @MinLength(1)
  phoneNumberId: string;

  @IsString()
  @MinLength(1)
  apiKey: string;

  // The WhatsApp Business Account id — needed to submit templates for
  // approval (see WhatsAppTemplateSubmissionService). Optional so a
  // credential can still be saved for sending before this is known; auto
  // template submission just stays off until it's filled in.
  @IsOptional()
  @IsString()
  wabaId?: string;
}
