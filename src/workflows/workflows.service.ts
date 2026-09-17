import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TRIGGER_NODE_TYPES,
  Workflow,
  WorkflowDocument,
  WorkflowNode,
} from './schemas/workflow.schema';
import {
  WorkflowRun,
  WorkflowRunDocument,
  WorkflowRunStatus,
  WorkflowStepStatus,
} from './schemas/workflow-run.schema';
import { Lead, LeadDocument, LeadStatus } from '../leads/schemas/lead.schema';
import {
  InboundMessage,
  InboundMessageDocument,
} from '../inbox/schemas/inbound-message.schema';
import { AiSentiment } from '../ai/ai-reply.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { MessagesService } from '../messages/messages.service';
import { TemplatesService } from '../templates/templates.service';

type RunStep = {
  nodeId: string;
  type: string;
  status: WorkflowStepStatus;
  message?: string;
  at: Date;
};

type RunTrigger = 'manual' | 'lead_created' | 'ai_replied';

// What the graph walk can read from as it visits nodes. A run only ever has
// one real source document (a lead, or an inbound message) — action_add_lead
// is the one node that turns an inbound-message run into a lead mid-walk.
type WalkContext = {
  lead: LeadDocument | null;
  inbound: InboundMessageDocument | null;
};

// Same {{variable}} substitution MessagesService uses for template bodies —
// small enough not to share, and this context (lead/inbound fields) is
// specific to the graph walk.
function renderTemplate(text: string, context: WalkContext): string {
  const vars: Record<string, string> = {
    lead_name: context.lead?.name ?? '',
    lead_phone: context.lead?.phone ?? '',
    lead_email: context.lead?.email ?? '',
    lead_status: context.lead?.status ?? '',
    message_text: context.inbound?.text ?? '',
    message_from: context.inbound?.from ?? '',
    ai_reply: context.inbound?.aiReplyText ?? '',
    ai_sentiment: context.inbound?.aiSentiment ?? '',
  };
  return text.replace(
    /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
    (_match, key: string) => vars[key] ?? '',
  );
}

const CALL_API_TIMEOUT_MS = 10_000;
const CALL_API_RESPONSE_PREVIEW_CHARS = 300;

function step(
  node: Pick<WorkflowNode, 'id' | 'type'>,
  status: WorkflowStepStatus,
  message?: string,
): RunStep {
  return { nodeId: node.id, type: node.type, status, message, at: new Date() };
}

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    @InjectModel(WorkflowRun.name)
    private readonly runModel: Model<WorkflowRunDocument>,
    // Direct model access rather than importing LeadsModule/InboxModule —
    // keeps the module graph acyclic (those modules import WorkflowsModule
    // to trigger runs; this module never needs to import them back).
    @InjectModel(Lead.name) private readonly leadModel: Model<LeadDocument>,
    @InjectModel(InboundMessage.name)
    private readonly inboundModel: Model<InboundMessageDocument>,
    private readonly messagesService: MessagesService,
    private readonly templatesService: TemplatesService,
  ) {}

  // GET /workflows always has something to show — a brand-new account gets
  // real, working starter workflows instead of an empty canvas.
  async listOrSeed(userId: string) {
    const existing = await this.workflowModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
    if (existing.length > 0) return existing;
    return Promise.all([
      this.createLeadSample(userId),
      this.createAiTriageSample(userId),
    ]);
  }

  async findOne(userId: string, id: string) {
    const workflow = await this.workflowModel
      .findOne({ _id: id, userId })
      .exec();
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  create(userId: string, dto: CreateWorkflowDto) {
    return this.workflowModel.create({
      userId,
      name: dto.name,
      active: true,
      nodes: [
        {
          id: 'trigger',
          type: 'trigger_manual',
          position: { x: 80, y: 160 },
          data: {},
        },
      ],
      edges: [],
    });
  }

  async update(userId: string, id: string, dto: UpdateWorkflowDto) {
    const updated = await this.workflowModel
      .findOneAndUpdate({ _id: id, userId }, { $set: dto }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Workflow not found');
    return updated;
  }

  async remove(userId: string, id: string) {
    const res = await this.workflowModel.deleteOne({ _id: id, userId }).exec();
    if (res.deletedCount === 0)
      throw new NotFoundException('Workflow not found');
    return { deleted: true };
  }

  async listRuns(userId: string, workflowId: string) {
    return this.runModel
      .find({ userId, workflowId })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();
  }

  async run(
    userId: string,
    workflowId: string,
    trigger: RunTrigger,
    refId?: string,
  ) {
    const workflow = await this.findOne(userId, workflowId);

    const wantedType =
      trigger === 'lead_created'
        ? 'trigger_lead_created'
        : trigger === 'ai_replied'
          ? 'trigger_ai_replied'
          : 'trigger_manual';
    const triggerNode =
      workflow.nodes.find((n) => n.type === wantedType) ??
      workflow.nodes.find((n) => TRIGGER_NODE_TYPES.includes(n.type));

    const steps: RunStep[] = [];
    const context: WalkContext = { lead: null, inbound: null };

    if (!triggerNode) {
      steps.push({
        nodeId: '',
        type: 'trigger',
        status: 'skipped',
        message: 'No trigger node on this workflow',
        at: new Date(),
      });
    } else {
      if (trigger === 'lead_created' && refId) {
        context.lead = await this.leadModel
          .findOne({ _id: refId, userId })
          .exec();
      } else if (trigger === 'ai_replied' && refId) {
        context.inbound = await this.inboundModel
          .findOne({ _id: refId, userId })
          .exec();
      }
      await this.walk(
        workflow,
        triggerNode.id,
        userId,
        context,
        steps,
        new Set(),
      );
    }

    const status: WorkflowRunStatus = steps.some((s) => s.status === 'error')
      ? 'error'
      : 'success';
    return this.runModel.create({ userId, workflowId, trigger, status, steps });
  }

  // Called after a lead is created (or promoted from a message) or after the
  // AI assistant processes an inbound message. Never lets a workflow failure
  // block the flow that invoked it.
  async runTriggersForEvent(
    userId: string,
    event: 'lead_created' | 'ai_replied',
    doc: LeadDocument | InboundMessageDocument,
  ) {
    const nodeType =
      event === 'lead_created' ? 'trigger_lead_created' : 'trigger_ai_replied';

    const workflows = await this.workflowModel
      .find({ userId, active: true, 'nodes.type': nodeType })
      .exec();

    for (const workflow of workflows) {
      try {
        await this.run(
          userId,
          workflow._id.toString(),
          event,
          doc._id.toString(),
        );
      } catch {
        // Swallow — a broken workflow shouldn't block the flow that fired it.
      }
    }
  }

  private async walk(
    workflow: WorkflowDocument,
    nodeId: string,
    userId: string,
    context: WalkContext,
    steps: RunStep[],
    visited: Set<string>,
  ) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    let branchHandle: 'true' | 'false' | undefined;
    const { lead, inbound } = context;

    switch (node.type) {
      case 'trigger_lead_created':
      case 'trigger_manual':
        steps.push(step(node, 'success', 'Triggered'));
        break;

      case 'trigger_ai_replied':
        steps.push(
          step(
            node,
            'success',
            inbound
              ? `AI replied — sentiment "${inbound.aiSentiment ?? 'unknown'}", ${inbound.aiInDomain === false ? 'off-topic' : 'in-domain'}`
              : 'Triggered',
          ),
        );
        break;

      case 'action_send_whatsapp': {
        if (!lead) {
          steps.push(step(node, 'error', 'No lead in context to send to'));
          break;
        }
        if (!lead.phone) {
          steps.push(
            step(node, 'error', `${lead.name} has no phone number on file`),
          );
          break;
        }
        const templateId = node.data?.templateId as string | undefined;
        if (!templateId) {
          steps.push(
            step(node, 'error', 'No WhatsApp template configured on this step'),
          );
          break;
        }
        try {
          await this.messagesService.send(userId, {
            templateId,
            recipients: [lead.phone],
            variables: { name: lead.name },
          });
          steps.push(step(node, 'success', `Sent to ${lead.phone}`));
        } catch (err) {
          steps.push(
            step(
              node,
              'error',
              err instanceof Error ? err.message : 'Send failed',
            ),
          );
        }
        break;
      }

      case 'action_update_lead_status': {
        const status = node.data?.status as LeadStatus | undefined;
        if (!lead || !status) {
          steps.push(
            step(node, 'error', 'No lead in context or no status configured'),
          );
          break;
        }
        await this.leadModel
          .updateOne({ _id: lead._id, userId }, { status })
          .exec();
        lead.status = status;
        steps.push(step(node, 'success', `Status set to "${status}"`));
        break;
      }

      case 'action_add_lead': {
        if (!inbound) {
          steps.push(
            step(
              node,
              'error',
              'No inbound message in context to create a lead from',
            ),
          );
          break;
        }
        const isEmail = inbound.channel === 'email';
        const existing = await this.leadModel
          .findOne({
            userId,
            ...(isEmail ? { email: inbound.from } : { phone: inbound.from }),
          })
          .exec();
        if (existing) {
          context.lead = existing;
          steps.push(
            step(node, 'success', `${existing.name} is already a lead`),
          );
          break;
        }
        const newLead = await this.leadModel.create({
          userId,
          name: inbound.from,
          phone: isEmail ? undefined : inbound.from,
          email: isEmail ? inbound.from : undefined,
          channel: inbound.channel,
          notes: inbound.text,
        });
        context.lead = newLead;
        await this.inboundModel
          .updateOne({ _id: inbound._id }, { leadId: newLead._id.toString() })
          .exec();
        steps.push(step(node, 'success', `Added ${newLead.name} as a lead`));
        // Chain into any workflow listening for trigger_lead_created too —
        // matches how a manually-added lead behaves.
        this.runTriggersForEvent(userId, 'lead_created', newLead).catch(
          () => {},
        );
        break;
      }

      case 'action_notify_admin': {
        const phoneNumber = node.data?.phoneNumber as string | undefined;
        const templateId = node.data?.templateId as string | undefined;
        if (!phoneNumber || !templateId) {
          steps.push(
            step(
              node,
              'error',
              'Admin phone number or template not configured',
            ),
          );
          break;
        }
        try {
          await this.messagesService.send(userId, {
            templateId,
            recipients: [phoneNumber],
            variables: {
              name: 'Admin',
              message: inbound?.text ?? lead?.notes ?? '',
              sentiment: inbound?.aiSentiment ?? '',
            },
          });
          steps.push(step(node, 'success', `Notified admin at ${phoneNumber}`));
        } catch (err) {
          steps.push(
            step(
              node,
              'error',
              err instanceof Error ? err.message : 'Send failed',
            ),
          );
        }
        break;
      }

      case 'action_wait': {
        const seconds = Number(node.data?.seconds ?? 0);
        steps.push(
          step(
            node,
            'success',
            `Would wait ${seconds}s (test runs don't pause)`,
          ),
        );
        break;
      }

      case 'action_call_api': {
        const url = node.data?.url as string | undefined;
        const method = (node.data?.method as string | undefined) ?? 'GET';
        const headersRaw = node.data?.headers as string | undefined;
        const bodyRaw = node.data?.body as string | undefined;

        if (!url) {
          steps.push(step(node, 'error', 'No URL configured on this step'));
          break;
        }

        let headers: Record<string, string> = {};
        if (headersRaw?.trim()) {
          try {
            headers = JSON.parse(renderTemplate(headersRaw, context)) as Record<
              string,
              string
            >;
          } catch {
            steps.push(
              step(
                node,
                'error',
                'Headers must be valid JSON, e.g. {"Authorization": "Bearer …"}',
              ),
            );
            break;
          }
        }

        const renderedUrl = renderTemplate(url, context);
        const renderedBody =
          bodyRaw && method !== 'GET'
            ? renderTemplate(bodyRaw, context)
            : undefined;

        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          CALL_API_TIMEOUT_MS,
        );
        try {
          const res = await fetch(renderedUrl, {
            method,
            headers: renderedBody
              ? { 'Content-Type': 'application/json', ...headers }
              : headers,
            body: renderedBody,
            signal: controller.signal,
          });
          const text = await res.text().catch(() => '');
          const preview = text.slice(0, CALL_API_RESPONSE_PREVIEW_CHARS);
          if (!res.ok) {
            steps.push(
              step(
                node,
                'error',
                `${method} ${renderedUrl} → ${res.status}: ${preview}`,
              ),
            );
          } else {
            steps.push(
              step(
                node,
                'success',
                `${method} ${renderedUrl} → ${res.status} ${preview}`,
              ),
            );
          }
        } catch (err) {
          const message =
            err instanceof Error && err.name === 'AbortError'
              ? `Request timed out after ${CALL_API_TIMEOUT_MS / 1000}s`
              : err instanceof Error
                ? err.message
                : 'Request failed';
          steps.push(
            step(node, 'error', `${method} ${renderedUrl} → ${message}`),
          );
        } finally {
          clearTimeout(timeout);
        }
        break;
      }

      case 'condition_lead_status': {
        const status = node.data?.status as LeadStatus | undefined;
        const matches = !!lead && !!status && lead.status === status;
        branchHandle = matches ? 'true' : 'false';
        steps.push(
          step(
            node,
            'success',
            `Lead status is${matches ? '' : ' not'} "${status ?? '—'}"`,
          ),
        );
        break;
      }

      case 'condition_ai_sentiment': {
        const wanted = node.data?.sentiment as AiSentiment | undefined;
        const matches = !!inbound && !!wanted && inbound.aiSentiment === wanted;
        branchHandle = matches ? 'true' : 'false';
        steps.push(
          step(
            node,
            'success',
            `AI sentiment is${matches ? '' : ' not'} "${wanted ?? '—'}" (actual: ${inbound?.aiSentiment ?? 'unknown'})`,
          ),
        );
        break;
      }

      case 'condition_ai_in_domain': {
        const inDomain = inbound?.aiInDomain !== false;
        branchHandle = inDomain ? 'true' : 'false';
        steps.push(
          step(
            node,
            'success',
            inDomain
              ? 'Question was within the business domain'
              : 'Question was off-topic for this business',
          ),
        );
        break;
      }
    }

    const outgoing = workflow.edges.filter(
      (e) =>
        e.source === nodeId &&
        (branchHandle === undefined ||
          (e.sourceHandle ?? 'true') === branchHandle),
    );
    for (const edge of outgoing) {
      await this.walk(workflow, edge.target, userId, context, steps, visited);
    }
  }

  private async createLeadSample(userId: string) {
    const [welcomeTemplate] = await this.templatesService.list(
      userId,
      'whatsapp',
    );

    return this.workflowModel.create({
      userId,
      name: 'Welcome new leads',
      active: true,
      nodes: [
        {
          id: 'trigger',
          type: 'trigger_lead_created',
          position: { x: 60, y: 160 },
          data: {},
        },
        {
          id: 'send',
          type: 'action_send_whatsapp',
          position: { x: 360, y: 160 },
          data: { templateId: welcomeTemplate?._id ?? '' },
        },
        {
          id: 'update',
          type: 'action_update_lead_status',
          position: { x: 660, y: 160 },
          data: { status: 'contacted' },
        },
      ],
      edges: [
        { id: 'e-trigger-send', source: 'trigger', target: 'send' },
        { id: 'e-send-update', source: 'send', target: 'update' },
      ],
    });
  }

  // Demonstrates the business-oriented shape this engine is really for:
  // an AI reply gets triaged by domain relevance, then by sentiment, before
  // deciding whether a human needs to step in or a lead should be recorded.
  private async createAiTriageSample(userId: string) {
    const [template] = await this.templatesService.list(userId, 'whatsapp');
    const templateId = template?._id ?? '';

    return this.workflowModel.create({
      userId,
      name: 'AI reply triage',
      active: true,
      nodes: [
        {
          id: 'trigger',
          type: 'trigger_ai_replied',
          position: { x: 40, y: 260 },
          data: {},
        },
        {
          id: 'domain',
          type: 'condition_ai_in_domain',
          position: { x: 320, y: 260 },
          data: {},
        },
        {
          id: 'offtopic_notify',
          type: 'action_notify_admin',
          position: { x: 600, y: 420 },
          data: { templateId, phoneNumber: '' },
        },
        {
          id: 'sentiment_negative',
          type: 'condition_ai_sentiment',
          position: { x: 600, y: 140 },
          data: { sentiment: 'negative' },
        },
        {
          id: 'notify_admin',
          type: 'action_notify_admin',
          position: { x: 880, y: 40 },
          data: { templateId, phoneNumber: '' },
        },
        {
          id: 'sentiment_positive',
          type: 'condition_ai_sentiment',
          position: { x: 880, y: 220 },
          data: { sentiment: 'positive' },
        },
        {
          id: 'add_lead',
          type: 'action_add_lead',
          position: { x: 1160, y: 140 },
          data: {},
        },
      ],
      edges: [
        { id: 'e-trigger-domain', source: 'trigger', target: 'domain' },
        {
          id: 'e-domain-sentiment_negative',
          source: 'domain',
          target: 'sentiment_negative',
          sourceHandle: 'true',
        },
        {
          id: 'e-domain-offtopic',
          source: 'domain',
          target: 'offtopic_notify',
          sourceHandle: 'false',
        },
        {
          id: 'e-negative-notify',
          source: 'sentiment_negative',
          target: 'notify_admin',
          sourceHandle: 'true',
        },
        {
          id: 'e-negative-positive',
          source: 'sentiment_negative',
          target: 'sentiment_positive',
          sourceHandle: 'false',
        },
        {
          id: 'e-positive-addlead',
          source: 'sentiment_positive',
          target: 'add_lead',
          sourceHandle: 'true',
        },
      ],
    });
  }
}
