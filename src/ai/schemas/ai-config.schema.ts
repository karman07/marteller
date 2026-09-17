import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Channel, CHANNELS } from '../../templates/schemas/template.schema';

export type KeyMode = 'own_key' | 'managed_credits';
export type DataSourceStatus = 'processing' | 'ready';
export type DataSourceType = 'file' | 'text' | 'url';
export type AiProvider = 'anthropic' | 'openai' | 'google' | 'xai' | 'deepseek';

export const AI_PROVIDERS: { id: AiProvider; label: string }[] = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'google', label: 'Google' },
  { id: 'xai', label: 'xAI' },
  { id: 'deepseek', label: 'DeepSeek' },
];
export const AI_PROVIDER_IDS = AI_PROVIDERS.map((p) => p.id);

// Catalog of models offered under managed-credits billing. Rates are
// relative placeholders (this app doesn't call these providers for real —
// see AiService) but ordered to roughly track each provider's real
// price tiers, cheapest to most capable.
export const AI_MODELS = [
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    label: 'GPT-4o mini',
    ratePer1kTokensPaise: 12,
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    label: 'GPT-4o',
    ratePer1kTokensPaise: 35,
  },
  {
    id: 'claude-haiku-4-5',
    provider: 'anthropic',
    label: 'Claude Haiku 4.5',
    ratePer1kTokensPaise: 15,
  },
  {
    id: 'claude-sonnet-5',
    provider: 'anthropic',
    label: 'Claude Sonnet 5',
    ratePer1kTokensPaise: 40,
  },
  {
    id: 'claude-opus-5',
    provider: 'anthropic',
    label: 'Claude Opus 5',
    ratePer1kTokensPaise: 90,
  },
  {
    id: 'gemini-2-0-flash',
    provider: 'google',
    label: 'Gemini 2.0 Flash',
    ratePer1kTokensPaise: 8,
  },
  {
    id: 'gemini-2-5-pro',
    provider: 'google',
    label: 'Gemini 2.5 Pro',
    ratePer1kTokensPaise: 30,
  },
  {
    id: 'grok-3-mini',
    provider: 'xai',
    label: 'Grok 3 mini',
    ratePer1kTokensPaise: 10,
  },
  { id: 'grok-3', provider: 'xai', label: 'Grok 3', ratePer1kTokensPaise: 32 },
  {
    id: 'deepseek-v3',
    provider: 'deepseek',
    label: 'DeepSeek V3',
    ratePer1kTokensPaise: 6,
  },
  {
    id: 'deepseek-r1',
    provider: 'deepseek',
    label: 'DeepSeek R1',
    ratePer1kTokensPaise: 14,
  },
] as const;
export type AiModelId = (typeof AI_MODELS)[number]['id'];
export const AI_MODEL_IDS = AI_MODELS.map((m) => m.id);

@Schema({ _id: true })
export class DataSource {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: ['file', 'text', 'url'], required: true })
  type: DataSourceType;

  @Prop({ enum: ['processing', 'ready'], default: 'processing' })
  status: DataSourceStatus;

  @Prop({ default: () => new Date() })
  addedAt: Date;
}

const DataSourceSchema = SchemaFactory.createForClass(DataSource);

// One saved key per provider — a "Claude Sonnet" and a "Claude Opus" card
// both use the Anthropic key, so keys are managed per provider, not per
// model card.
@Schema({ _id: false })
export class OwnApiKeyEntry {
  @Prop({ enum: AI_PROVIDER_IDS, required: true })
  provider: AiProvider;

  @Prop({ required: true })
  key: string;

  @Prop({ default: () => new Date() })
  updatedAt: Date;
}

const OwnApiKeyEntrySchema = SchemaFactory.createForClass(OwnApiKeyEntry);

export type AiConfigDocument = HydratedDocument<AiConfig>;

@Schema({ timestamps: true })
export class AiConfig {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ enum: AI_MODEL_IDS, default: 'claude-haiku-4-5' })
  selectedModel: AiModelId;

  @Prop({ enum: ['own_key', 'managed_credits'], default: 'managed_credits' })
  keyMode: KeyMode;

  @Prop({ type: [OwnApiKeyEntrySchema], default: [] })
  ownApiKeys: OwnApiKeyEntry[];

  @Prop({ type: [DataSourceSchema], default: [] })
  dataSources: DataSource[];

  // Channels the assistant is allowed to auto-reply on, grounded in
  // dataSources via RAG. Dispatch wiring lives in the messaging pipeline,
  // not here — this is the on/off switch per channel.
  @Prop({ type: [String], enum: CHANNELS, default: [] })
  autoReplyChannels: Channel[];

  // Channels where a generated reply is sent immediately rather than held
  // for the user to approve first (see InboundMessage.replyStatus). A
  // channel here implies it's also in autoReplyChannels — the reply has to
  // be generated before it can be sent.
  @Prop({ type: [String], enum: CHANNELS, default: [] })
  autoSendChannels: Channel[];

  // Freeform behavior guidance — tone, escalation rules, what not to promise.
  @Prop()
  systemPrompt?: string;
}

export const AiConfigSchema = SchemaFactory.createForClass(AiConfig);
