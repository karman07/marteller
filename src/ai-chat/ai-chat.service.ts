import { ForbiddenException, Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AiReplyService } from '../ai/ai-reply.service';
import { retrieveRelevantChunks } from '../ai/knowledge-retrieval';
import { PlanEnforcementService } from '../billing/plan-enforcement.service';
import { TemplatesService } from '../templates/templates.service';
import { MessagesService } from '../messages/messages.service';
import type { Channel, WhatsappCategory } from '../templates/schemas/template.schema';
import { ChatMessageDto } from './dto/chat.dto';

export type ChatToolUse = { tool: string; summary: string };
export type ChatResult = { reply: string; toolsUsed: ChatToolUse[] };

// Tool-calling only works through Anthropic's native tools param — see the
// plan this feature was built from: OpenAI-compatible/Gemini providers
// still power plain RAG-grounded conversation below, just without the
// ability to actually create a template or pull real analytics.
const CREATE_TEMPLATE_TOOL: Anthropic.Tool = {
  name: 'create_template',
  description:
    "Create and save a real message template for this business on a given channel. Use this whenever the user asks you to create, draft, write, or make a template — don't just describe one in the chat reply if they want it saved.",
  input_schema: {
    type: 'object',
    properties: {
      channel: { type: 'string', enum: ['whatsapp', 'email', 'sms'] },
      name: { type: 'string', description: 'Short internal label, not shown to customers' },
      body: {
        type: 'string',
        description:
          'The template text. Use {{snake_case}} placeholders for personalization (e.g. {{name}}, {{order_id}}) — never invent real customer data.',
      },
      subject: { type: 'string', description: 'Email only — the subject line' },
      category: {
        type: 'string',
        enum: ['marketing', 'utility', 'authentication'],
        description: 'WhatsApp only',
      },
      footer: { type: 'string', description: 'WhatsApp only, max 60 chars' },
    },
    required: ['channel', 'name', 'body'],
  },
};

const GET_ANALYTICS_TOOL: Anthropic.Tool = {
  name: 'get_analytics',
  description:
    "Fetch this business's real, current message analytics — messages sent, delivery rate, spend, and status breakdown. Use this whenever the user asks how they're doing, for stats, or about performance, instead of guessing.",
  input_schema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        enum: ['whatsapp', 'email', 'sms'],
        description: 'Omit to combine all channels',
      },
      days: { type: 'number', description: 'How many days back to look, default 14' },
    },
  },
};

@Injectable()
export class AiChatService {
  constructor(
    private readonly aiReplyService: AiReplyService,
    private readonly planEnforcementService: PlanEnforcementService,
    private readonly templatesService: TemplatesService,
    private readonly messagesService: MessagesService,
  ) {}

  async chat(userId: string, history: ChatMessageDto[]): Promise<ChatResult> {
    const allowed = await this.planEnforcementService.checkAndReserve(userId, 'ai', 1);
    if (!allowed) {
      throw new ForbiddenException(
        'No AI generations left this period — upgrade your plan or wait for the next billing cycle.',
      );
    }

    const { config, model, apiKey } = await this.aiReplyService.resolveModelAndKey(userId);
    const lastUserMessage = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';
    const chunks = retrieveRelevantChunks(config.dataSources, lastUserMessage);

    const system = [
      'You are the AI assistant inside the Marteller marketing platform, chatting directly with the business owner (not their customer) inside their own dashboard.',
      'You can help draft and save message templates for WhatsApp, Email, and SMS, and report this account\'s own real message analytics.',
      config.systemPrompt ? `Guidance from the business owner on tone:\n${config.systemPrompt}` : '',
      chunks.length > 0
        ? "Relevant excerpts from this business's own knowledge base — prefer this over general knowledge when it applies:\n" +
          chunks.map((c) => `[${c.sourceName}]\n${c.text}`).join('\n\n')
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    if (model.provider === 'anthropic') {
      return this.chatWithTools(model.id, apiKey, system, history, userId);
    }

    // Non-Anthropic: plain completion, no tool execution. The full history
    // is folded into one message since callProvider only takes a single
    // user turn — a deliberate scope limit (see plan), not an oversight.
    const transcript = history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    const reply = await this.aiReplyService.callProvider(
      model.provider,
      model.id,
      apiKey,
      system +
        '\n\nYou cannot create templates or fetch analytics on this model — if asked, say so plainly and suggest switching to an Anthropic model in AI Assistant → Model.',
      transcript,
    );
    return { reply, toolsUsed: [] };
  }

  private async chatWithTools(
    modelId: string,
    apiKey: string,
    system: string,
    history: ChatMessageDto[],
    userId: string,
  ): Promise<ChatResult> {
    const anthropic = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
    const tools = [CREATE_TEMPLATE_TOOL, GET_ANALYTICS_TOOL];

    const first = await anthropic.messages.create({
      model: modelId,
      max_tokens: 1024,
      system,
      messages,
      tools,
    });

    const toolUseBlocks = first.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    if (toolUseBlocks.length === 0) {
      const textBlock = first.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
      return { reply: textBlock?.text ?? '', toolsUsed: [] };
    }

    const toolsUsed: ChatToolUse[] = [];
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const { resultText, summary } = await this.executeTool(userId, block.name, block.input as Record<string, unknown>);
      toolsUsed.push({ tool: block.name, summary });
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: resultText });
    }

    // One follow-up round only (not a full agentic loop) — bounds cost and
    // complexity; good enough for "create this" / "how am I doing" asks.
    const second = await anthropic.messages.create({
      model: modelId,
      max_tokens: 1024,
      system,
      messages: [
        ...messages,
        { role: 'assistant', content: first.content },
        { role: 'user', content: toolResults },
      ],
      tools,
    });

    const finalText = second.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    return { reply: finalText?.text ?? '', toolsUsed };
  }

  private async executeTool(
    userId: string,
    name: string,
    input: Record<string, unknown>,
  ): Promise<{ resultText: string; summary: string }> {
    if (name === 'create_template') {
      const channel = input.channel as Channel;
      const template = await this.templatesService.create(userId, {
        channel,
        name: String(input.name ?? 'Untitled'),
        body: String(input.body ?? ''),
        subject: typeof input.subject === 'string' ? input.subject : undefined,
        category: typeof input.category === 'string' ? (input.category as WhatsappCategory) : undefined,
        footer: typeof input.footer === 'string' ? input.footer : undefined,
      });
      const summary = `Created ${channel} template "${template.name}"`;
      return { resultText: `Created and saved. Template id: ${template.id}.`, summary };
    }

    if (name === 'get_analytics') {
      const channel = typeof input.channel === 'string' ? (input.channel as Channel) : undefined;
      const days = typeof input.days === 'number' ? input.days : 14;
      const summaryData = await this.messagesService.summary(userId, channel, days);
      return {
        resultText: JSON.stringify(summaryData),
        summary: `Looked up ${channel ?? 'all-channel'} analytics (${days}d)`,
      };
    }

    return { resultText: `Unknown tool "${name}"`, summary: `Unknown tool "${name}"` };
  }
}
