import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  recipients: string[];

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  // Per-recipient overrides, keyed by the recipient's `to` value — e.g. a
  // contact's own name substituted into {{name}} instead of one shared value
  // for the whole batch. Merged on top of `variables` for that recipient only.
  @IsOptional()
  @IsObject()
  recipientVariables?: Record<string, Record<string, string>>;
}
