import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AI_MODELS,
  AI_PROVIDER_IDS,
  AiConfig,
  AiConfigDocument,
  AiProvider,
} from './schemas/ai-config.schema';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { CreateDataSourceDto } from './dto/create-data-source.dto';
import { CHANNELS, type Channel } from '../templates/schemas/template.schema';

const SIMULATED_INGEST_MS = 4000;

// Never echo a saved key back to the client — show only enough to recognize
// it (e.g. "•••• 7f3a"), the same way every real key-management UI does.
function maskKey(key: string): string {
  return key.length <= 4 ? '••••' : `•••• ${key.slice(-4)}`;
}

function toClientConfig(doc: AiConfigDocument) {
  const obj = doc.toObject();
  return {
    ...obj,
    ownApiKeys: obj.ownApiKeys.map((k) => ({
      provider: k.provider,
      maskedKey: maskKey(k.key),
      updatedAt: k.updatedAt,
    })),
  };
}

// Deterministic PRNG (mulberry32) seeded from a string — same userId + days
// always produces the same-looking demo chart instead of reshuffling on
// every reload, without persisting anything.
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHANNEL_WEIGHT: Record<Channel, number> = {
  whatsapp: 1,
  email: 0.5,
  sms: 0.3,
};

@Injectable()
export class AiService {
  constructor(
    @InjectModel(AiConfig.name) private readonly model: Model<AiConfigDocument>,
    private readonly config: ConfigService,
  ) {}

  models() {
    return AI_MODELS;
  }

  private async getConfigDoc(userId: string) {
    const existing = await this.model.findOne({ userId }).exec();
    if (existing) return existing;
    return this.model.create({ userId });
  }

  async getConfig(userId: string) {
    return toClientConfig(await this.getConfigDoc(userId));
  }

  async updateConfig(userId: string, dto: UpdateAiConfigDto) {
    const updated = await this.model
      .findOneAndUpdate({ userId }, { $set: dto }, { upsert: true, new: true })
      .exec();
    return toClientConfig(updated);
  }

  async setProviderKey(userId: string, provider: AiProvider, key: string) {
    if (!AI_PROVIDER_IDS.includes(provider)) {
      throw new BadRequestException(`Unknown provider: ${provider}`);
    }
    const existing = await this.getConfigDoc(userId);
    const ownApiKeys = existing.ownApiKeys.filter(
      (k) => k.provider !== provider,
    );
    ownApiKeys.push({ provider, key, updatedAt: new Date() });
    const updated = await this.model
      .findOneAndUpdate({ userId }, { $set: { ownApiKeys } }, { new: true })
      .exec();
    return toClientConfig(updated!);
  }

  async removeProviderKey(userId: string, provider: AiProvider) {
    if (!AI_PROVIDER_IDS.includes(provider)) {
      throw new BadRequestException(`Unknown provider: ${provider}`);
    }
    const existing = await this.getConfigDoc(userId);
    const ownApiKeys = existing.ownApiKeys.filter(
      (k) => k.provider !== provider,
    );
    const updated = await this.model
      .findOneAndUpdate({ userId }, { $set: { ownApiKeys } }, { new: true })
      .exec();
    return toClientConfig(updated!);
  }

  async addDataSource(userId: string, dto: CreateDataSourceDto) {
    const config = await this.model
      .findOneAndUpdate(
        { userId },
        {
          $push: {
            dataSources: {
              name: dto.name,
              type: dto.type,
              status: 'processing',
            },
          },
        },
        { upsert: true, new: true },
      )
      .exec();

    const added = config.dataSources[config.dataSources.length - 1];

    // Simulated ingestion — no real embeddings/processing pipeline yet.
    setTimeout(() => {
      this.model
        .updateOne(
          { userId, 'dataSources._id': added._id },
          { $set: { 'dataSources.$.status': 'ready' } },
        )
        .exec()
        .catch(() => {});
    }, SIMULATED_INGEST_MS);

    return toClientConfig(config);
  }

  async removeDataSource(userId: string, dataSourceId: string) {
    const config = await this.model
      .findOneAndUpdate(
        { userId },
        { $pull: { dataSources: { _id: new Types.ObjectId(dataSourceId) } } },
        { new: true },
      )
      .exec();
    if (!config) throw new NotFoundException('AI config not found');
    return toClientConfig(config);
  }

  // There's no real query pipeline behind this feature yet (see the
  // simulated-ingestion comment above) — nothing to report in production.
  // In dev, generate a stable, believable-looking demo dataset so the
  // analytics page isn't empty while the UI is being built against it.
  analyticsSummary(userId: string, days = 14) {
    const isDevBypassEnabled =
      this.config.get<string>('NODE_ENV') !== 'production' &&
      this.config.get<string>('DEV_PHONE_AUTH_BYPASS') === 'true';
    return isDevBypassEnabled
      ? this.generateDummyAnalytics(userId, days)
      : this.emptyAnalytics(days);
  }

  private emptyAnalytics(days: number) {
    return {
      days,
      totalQueries: 0,
      autoReplyRate: 0,
      avgResponseMs: 0,
      tokensUsed: 0,
      costPaise: 0,
      dailyQueries: [] as { day: string; count: number }[],
      dailyByChannel: [] as { day: string; channel: Channel; count: number }[],
      byChannel: CHANNELS.map((channel) => ({ channel, count: 0 })),
      byStatus: [
        { status: 'resolved' as const, count: 0 },
        { status: 'escalated' as const, count: 0 },
      ],
      isDummyData: false,
    };
  }

  private generateDummyAnalytics(userId: string, days: number) {
    const rand = seededRandom(hashString(`${userId}:${days}`));
    const today = new Date();

    const dailyByChannel: { day: string; channel: Channel; count: number }[] =
      [];
    const dailyQueries: { day: string; count: number }[] = [];
    const channelTotals: Record<Channel, number> = {
      whatsapp: 0,
      email: 0,
      sms: 0,
    };

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const day = d.toISOString().slice(0, 10);

      let dayTotal = 0;
      for (const channel of CHANNELS) {
        const base = 4 + rand() * 10;
        const count = Math.round(
          base * CHANNEL_WEIGHT[channel] * (0.5 + rand()),
        );
        if (count > 0) dailyByChannel.push({ day, channel, count });
        channelTotals[channel] += count;
        dayTotal += count;
      }
      dailyQueries.push({ day, count: dayTotal });
    }

    const totalQueries = dailyQueries.reduce((sum, r) => sum + r.count, 0);
    const resolved = Math.round(totalQueries * (0.78 + rand() * 0.12));
    const escalated = totalQueries - resolved;
    const tokensUsed = totalQueries * Math.round(180 + rand() * 220);
    const costPaise = Math.round((tokensUsed / 1000) * 18);
    const avgResponseMs = Math.round(900 + rand() * 1400);

    return {
      days,
      totalQueries,
      autoReplyRate:
        totalQueries > 0 ? Math.round((resolved / totalQueries) * 100) : 0,
      avgResponseMs,
      tokensUsed,
      costPaise,
      dailyQueries,
      dailyByChannel,
      byChannel: CHANNELS.map((channel) => ({
        channel,
        count: channelTotals[channel],
      })),
      byStatus: [
        { status: 'resolved' as const, count: resolved },
        { status: 'escalated' as const, count: escalated },
      ],
      isDummyData: true,
    };
  }
}
