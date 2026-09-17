import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel, Template, TemplateDocument, TemplateButton, WhatsappCategory } from './schemas/template.schema';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
const SYSTEM_USER_ID = 'system';

// Meta's WhatsApp template limits: at most one phone-number button and two
// URL buttons per template (quick replies have no per-type cap of their own).
function validateButtonCaps(buttons?: TemplateButton[]) {
  if (!buttons) return;
  const phoneCount = buttons.filter((b) => b.type === 'phone_number').length;
  const urlCount = buttons.filter((b) => b.type === 'url').length;
  if (phoneCount > 1) throw new BadRequestException('Only one phone number button is allowed per template');
  if (urlCount > 2) throw new BadRequestException('Only up to two website buttons are allowed per template');
}

export function extractVariables(...texts: (string | undefined)[]): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const match of text.matchAll(VARIABLE_PATTERN)) {
      found.add(match[1]);
    }
  }
  return Array.from(found);
}

const SYSTEM_TEMPLATES: Omit<CreateTemplateDto, 'buttons'>[] = [
  {
    channel: 'whatsapp',
    name: 'Order Confirmation',
    category: 'utility',
    header: 'Order Confirmed',
    body: 'Hi {{name}}, your order {{order_id}} has been confirmed and will arrive by {{date}}.',
    footer: 'Thank you for shopping with us',
  },
  {
    channel: 'whatsapp',
    name: 'Welcome Message',
    category: 'marketing',
    body: "Hi {{name}}, welcome to {{business_name}}! We're glad to have you with us.",
  },
  {
    channel: 'email',
    name: 'Welcome Email',
    subject: 'Welcome to {{business_name}}!',
    body: 'Hi {{name}},\n\nThanks for signing up with {{business_name}}. We\'re excited to have you on board.\n\nBest,\n{{business_name}} Team',
  },
  {
    channel: 'sms',
    name: 'OTP Verification',
    body: 'Your OTP is {{code}}. Valid for 5 minutes. Do not share this code with anyone.',
  },
  {
    channel: 'sms',
    name: 'Order Update',
    body: 'Hi {{name}}, your order {{order_id}} is out for delivery.',
  },
];

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(@InjectModel(Template.name) private model: Model<TemplateDocument>) {}

  async onModuleInit() {
    for (const tpl of SYSTEM_TEMPLATES) {
      const variables = extractVariables(tpl.header, tpl.body, tpl.footer, tpl.subject);
      await this.model
        .findOneAndUpdate(
          { name: tpl.name, channel: tpl.channel, isSystem: true },
          { ...tpl, userId: SYSTEM_USER_ID, isSystem: true, variables },
          { upsert: true },
        )
        .exec();
    }
  }

  list(userId: string, channel?: Channel, category?: WhatsappCategory) {
    return this.model
      .find({
        $or: [{ userId }, { isSystem: true }],
        ...(channel ? { channel } : {}),
        ...(category ? { category } : {}),
      })
      .sort({ isSystem: 1, createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string) {
    const template = await this.model
      .findOne({ _id: id, $or: [{ userId }, { isSystem: true }] })
      .exec();
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  create(userId: string, dto: CreateTemplateDto) {
    validateButtonCaps(dto.buttons);
    const variables = extractVariables(dto.header, dto.body, dto.footer, dto.subject);
    return this.model.create({ ...dto, userId, variables });
  }

  async update(userId: string, id: string, dto: UpdateTemplateDto) {
    const existing = await this.findOne(userId, id);
    if (existing.isSystem) throw new ForbiddenException('Shared templates cannot be edited');
    validateButtonCaps(dto.buttons);

    const variables = extractVariables(
      dto.header ?? existing.header,
      dto.body ?? existing.body,
      dto.footer ?? existing.footer,
      dto.subject ?? existing.subject,
    );

    const updated = await this.model
      .findByIdAndUpdate(id, { ...dto, variables }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Template not found');
    return updated;
  }

  async remove(userId: string, id: string) {
    const existing = await this.findOne(userId, id);
    if (existing.isSystem) throw new ForbiddenException('Shared templates cannot be deleted');

    await this.model.deleteOne({ _id: id, userId }).exec();
    return { deleted: true };
  }
}
