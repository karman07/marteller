import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import {
  AI_MODEL_IDS,
  type AiModelId,
  type KeyMode,
} from '../schemas/ai-config.schema';
import {
  CHANNELS,
  type Channel,
} from '../../templates/schemas/template.schema';

export class UpdateAiConfigDto {
  @IsOptional()
  @IsIn(AI_MODEL_IDS)
  selectedModel?: AiModelId;

  @IsOptional()
  @IsIn(['own_key', 'managed_credits'])
  keyMode?: KeyMode;

  @IsOptional()
  @IsArray()
  @IsIn(CHANNELS, { each: true })
  autoReplyChannels?: Channel[];

  @IsOptional()
  @IsArray()
  @IsIn(CHANNELS, { each: true })
  autoSendChannels?: Channel[];

  @IsOptional()
  @IsString()
  systemPrompt?: string;
}
