import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import Anthropic from '@anthropic-ai/sdk';
import { Model } from 'mongoose';
import {
  AI_MODELS,
  AiConfig,
  AiConfigDocument,
  AiProvider,
} from './schemas/ai-config.schema';
import type { Channel } from '../templates/schemas/template.schema';

export type AiSentiment = 'positive' | 'negative' | 'neutral';
export const AI_SENTIMENTS: AiSentiment[] = ['positive', 'negative', 'neutral'];

export type AiReplyResult = {
  reply: string;
  sentiment: AiSentiment;
  inDomain: boolean;
  interested: boolean;
  provider: AiProvider;
  model: string;
};

const OPENAI_COMPATIBLE_BASE_URLS: Partial<Record<AiProvider, string>> = {
  openai: 'https://api.openai.com/v1',
  xai: 'https://api.x.ai/v1',
  deepseek: 'https://api.deepseek.com',
};

function buildSystemPrompt(businessGuidance?: string): string {
  return [
    'You are the AI customer-support and sales assistant for a business that uses the Marteller marketing platform.',
    businessGuidance
      ? `Guidance from the business owner on tone, offers, and escalation rules:\n${businessGuidance}`
      : 'The business owner has not set any specific guidance yet — reply helpfully and generically.',
    'A customer just sent an inbound message on WhatsApp, Email, or SMS. Write the reply this business would want sent back.',
    'If the message is clearly outside what this business sells or supports, politely say so, avoid guessing at unrelated topics, and offer to connect them with a human — and mark inDomain false. Otherwise mark inDomain true.',
    'Judge the customer\'s tone toward the business as "positive", "negative", or "neutral".',
    "This is the classification the business cares about most: is this customer a potential lead? Mark interested true if they show any genuine buying intent (asking about pricing, features, availability, how to sign up/order, requesting a demo or callback) OR ask a real, specific question about the business's product or service — a real question is itself a sign of interest worth following up on. Mark interested false only for spam, small talk with no product relevance, or messages that are clearly off-topic for this business.",
    'Respond with ONLY a single JSON object and nothing else, no markdown fences: {"reply": string, "sentiment": "positive" | "negative" | "neutral", "inDomain": boolean, "interested": boolean}',
  ].join('\n\n');
}

function extractJson(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toResult(
  raw: string,
  provider: AiProvider,
  model: string,
): AiReplyResult {
  const parsed = extractJson(raw);
  const sentiment =
    parsed && AI_SENTIMENTS.includes(parsed.sentiment as AiSentiment)
      ? (parsed.sentiment as AiSentiment)
      : 'neutral';
  const reply =
    parsed && typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply
      : raw.trim() ||
        'Thanks for reaching out — we will get back to you shortly.';
  const inDomain =
    parsed && typeof parsed.inDomain === 'boolean' ? parsed.inDomain : true;
  const interested =
    parsed && typeof parsed.interested === 'boolean'
      ? parsed.interested
      : false;
  return { reply, sentiment, inDomain, interested, provider, model };
}

@Injectable()
export class AiReplyService {
  constructor(
    @InjectModel(AiConfig.name)
    private readonly configModel: Model<AiConfigDocument>,
  ) {}

  // The "dispatch wiring" AiConfig.autoReplyChannels/autoSendChannels'
  // schema comments refer to — real inbound channels (currently: email,
  // see src/mail/mail-inbound.service.ts) check this before generating or
  // sending a reply. /inbox/simulate deliberately does not use this, since
  // it's an explicit manual test action, not a real inbound event.
  async getAutoReplySettings(userId: string, channel: Channel) {
    const config = await this.configModel.findOne({ userId }).exec();
    return {
      autoReply: config?.autoReplyChannels?.includes(channel) ?? false,
      autoSend: config?.autoSendChannels?.includes(channel) ?? false,
    };
  }

  async generateReply(
    userId: string,
    customerMessage: string,
  ): Promise<AiReplyResult> {
    const config = await this.configModel.findOne({ userId }).exec();
    if (!config) {
      throw new BadRequestException(
        'Set up the AI Assistant (model + API key) before testing replies.',
      );
    }
    if (config.keyMode !== 'own_key') {
      throw new BadRequestException(
        'Live AI replies need your own provider API key — switch to "Own API key" in AI Assistant → Model and save one.',
      );
    }

    const model = AI_MODELS.find((m) => m.id === config.selectedModel);
    if (!model) {
      throw new BadRequestException('Selected AI model is not recognized.');
    }

    const keyEntry = config.ownApiKeys.find(
      (k) => k.provider === model.provider,
    );
    if (!keyEntry) {
      throw new BadRequestException(
        `No ${model.provider} API key saved yet — add one in AI Assistant → Model.`,
      );
    }

    const system = buildSystemPrompt(config.systemPrompt);
    const raw = await this.callProvider(
      model.provider,
      model.id,
      keyEntry.key,
      system,
      customerMessage,
    );
    return toResult(raw, model.provider, model.id);
  }

  private async callProvider(
    provider: AiProvider,
    model: string,
    apiKey: string,
    system: string,
    userMessage: string,
  ): Promise<string> {
    if (provider === 'anthropic')
      return this.callAnthropic(apiKey, model, system, userMessage);
    if (provider === 'google')
      return this.callGemini(apiKey, model, system, userMessage);

    const baseUrl = OPENAI_COMPATIBLE_BASE_URLS[provider];
    if (!baseUrl) {
      throw new BadRequestException(
        `No live integration wired for provider "${provider}" yet.`,
      );
    }
    return this.callOpenAiCompatible(
      baseUrl,
      apiKey,
      model,
      system,
      userMessage,
    );
  }

  private async callAnthropic(
    apiKey: string,
    model: string,
    system: string,
    userMessage: string,
  ): Promise<string> {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = message.content.find((b) => b.type === 'text');
    if (!block)
      throw new BadRequestException('Anthropic returned no text reply.');
    return block.text;
  }

  private async callOpenAiCompatible(
    baseUrl: string,
    apiKey: string,
    model: string,
    system: string,
    userMessage: string,
  ): Promise<string> {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BadRequestException(
        `AI provider request failed (${res.status}): ${body.slice(0, 300)}`,
      );
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new BadRequestException('AI provider returned no reply.');
    return text;
  }

  private async callGemini(
    apiKey: string,
    model: string,
    system: string,
    userMessage: string,
  ): Promise<string> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BadRequestException(
        `AI provider request failed (${res.status}): ${body.slice(0, 300)}`,
      );
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new BadRequestException('AI provider returned no reply.');
    return text;
  }
}
