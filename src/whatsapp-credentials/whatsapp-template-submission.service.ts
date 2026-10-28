import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WhatsAppCredentialsService } from './whatsapp-credentials.service';
import { WhatsAppTemplateMappingService } from './whatsapp-template-mapping.service';
import type { Template, TemplateButton } from '../templates/schemas/template.schema';

const API_VERSION = 'v26.0';
const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
// Approval review takes real time (it's a human-reviewed WhatsApp
// process on the provider's side, same as everywhere else) — no value in
// polling more often than this.
const POLL_INTERVAL_MS = 10 * 60 * 1000;

const CATEGORY_MAP: Record<string, string> = {
  marketing: 'MARKETING',
  utility: 'UTILITY',
  authentication: 'AUTHENTICATION',
};

type SubmittableTemplate = Pick<
  Template,
  'name' | 'language' | 'category' | 'headerType' | 'header' | 'body' | 'footer' | 'buttons'
>;

function metaifyVariables(text: string): { text: string; example?: string[] } {
  if (!text) return { text };
  let i = 0;
  const example: string[] = [];
  const result = text.replace(VARIABLE_PATTERN, (_match, name: string) => {
    i += 1;
    example.push(name);
    return `{{${i}}}`;
  });
  return { text: result, example: example.length ? example : undefined };
}

function slugifyTemplateName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return slug || 'template';
}

function buildButtonComponent(buttons: TemplateButton[]) {
  return {
    type: 'BUTTONS',
    buttons: buttons.map((b) =>
      b.type === 'quick_reply'
        ? { type: 'QUICK_REPLY', text: b.text }
        : b.type === 'phone_number'
          ? { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phoneNumber }
          : { type: 'URL', text: b.text, url: b.url },
    ),
  };
}

// Submits WhatsApp templates for approval and polls for a decision, on the
// tenant's behalf — the one manual step this provider genuinely requires
// (there's no instant round trip; WhatsApp template review is a real,
// human-reviewed process same as any BSP), done here so the tenant never
// sees or does it (see WhatsAppTemplateMapping schema comment). Any
// failure — no WABA id on file yet, an image header (needs a separate
// media-upload contract this doesn't implement), or the call itself
// failing — just leaves the row in the staff manual queue exactly as if
// this service didn't exist, so there's no regression path.
@Injectable()
export class WhatsAppTemplateSubmissionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppTemplateSubmissionService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly credentialsService: WhatsAppCredentialsService,
    private readonly mappingService: WhatsAppTemplateMappingService,
  ) {}

  onModuleInit() {
    this.interval = setInterval(() => {
      this.pollPendingApprovals().catch((err) =>
        this.logger.warn(`Approval poll failed: ${err instanceof Error ? err.message : String(err)}`),
      );
    }, POLL_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  // Ensures a pending approval record exists for this tenant/template, and
  // — the first time only — attempts to auto-register it with the
  // provider. Safe to call repeatedly (e.g. every time the tenant's
  // template list is fetched); it only ever submits once.
  async ensurePendingAndSubmit(userId: string, template: { _id: unknown } & SubmittableTemplate) {
    const templateId = (template._id as { toString(): string }).toString();
    const mapping = await this.mappingService.ensurePending(userId, templateId);
    if (mapping.status === 'pending' && !mapping.providerTemplateId && !mapping.submissionAttemptedAt) {
      await this.mappingService.markSubmissionAttempted(userId, templateId);
      await this.trySubmit(userId, templateId, template);
    }
    return mapping;
  }

  private async trySubmit(userId: string, templateId: string, template: SubmittableTemplate) {
    // Media headers need a separate media-upload step to get a handle for
    // the `example.header_handle` field — no verified contract for that,
    // so these fall straight to the staff queue.
    if (template.headerType === 'image') return;

    const credential = await this.credentialsService.findByUserId(userId);
    if (!credential?.wabaId) return;

    const components: Record<string, unknown>[] = [];

    if (template.header) {
      const header = metaifyVariables(template.header);
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: header.text,
        ...(header.example ? { example: { header_text: header.example } } : {}),
      });
    }

    const body = metaifyVariables(template.body);
    components.push({
      type: 'BODY',
      text: body.text,
      ...(body.example ? { example: { body_text: [body.example] } } : {}),
    });

    if (template.footer) {
      components.push({ type: 'FOOTER', text: template.footer });
    }

    if (template.buttons?.length) {
      components.push(buildButtonComponent(template.buttons));
    }

    try {
      const res = await fetch(
        `https://www.fast2sms.com/dev/whatsapp/${API_VERSION}/${credential.wabaId}/message_templates`,
        {
          method: 'POST',
          headers: { authorization: credential.apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: slugifyTemplateName(template.name),
            language: template.language ?? 'en',
            category: CATEGORY_MAP[template.category ?? 'utility'],
            components,
          }),
        },
      );
      const data = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok || !data.id) {
        this.logger.warn(
          `Template submission failed for ${userId}/${templateId}: ${data.error?.message ?? res.status}`,
        );
        return;
      }
      await this.mappingService.setProviderTemplateId(userId, templateId, data.id);
    } catch (err) {
      this.logger.warn(
        `Template submission errored for ${userId}/${templateId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async pollPendingApprovals() {
    const pending = await this.mappingService.listAutoSubmitted();
    for (const mapping of pending) {
      const credential = await this.credentialsService.findByUserId(mapping.userId);
      if (!credential) continue;

      try {
        const res = await fetch(
          `https://www.fast2sms.com/dev/dlt_manager/whatsapp?type=template&phone_number_id=${credential.phoneNumberId}`,
          { headers: { authorization: credential.apiKey } },
        );
        const data = (await res.json()) as {
          data?: { templates?: { template_id: string; message_id: number | string; status: string }[] }[];
        };
        const match = data.data
          ?.flatMap((row) => row.templates ?? [])
          .find((t) => String(t.template_id) === mapping.providerTemplateId);
        if (!match) continue;

        if (match.status === 'Approved') {
          await this.mappingService.approve(
            mapping.userId,
            mapping.templateId,
            String(match.message_id),
            'system-auto',
          );
        } else if (match.status === 'Rejected') {
          await this.mappingService.reject(
            mapping.userId,
            mapping.templateId,
            'Not approved by WhatsApp',
            'system-auto',
          );
        }
      } catch (err) {
        this.logger.warn(
          `Approval check failed for ${mapping.userId}/${mapping.templateId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
