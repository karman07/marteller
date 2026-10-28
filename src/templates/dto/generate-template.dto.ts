import { IsIn, IsString, MinLength } from 'class-validator';
import { CHANNELS, type Channel } from '../schemas/template.schema';

export class GenerateTemplateDto {
  @IsIn(CHANNELS)
  channel: Channel;

  @IsString()
  @MinLength(3)
  prompt: string;
}
