import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { WorkflowsService } from '../workflows/workflows.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private readonly model: Model<LeadDocument>,
    // Direct model access, same reasoning as WorkflowsService reading Lead
    // directly — reading one field off a message log doesn't need the full
    // MessagesModule (wallet/verification/provider wiring).
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly workflowsService: WorkflowsService,
  ) {}

  list(userId: string) {
    return this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(500)
      .exec();
  }

  async create(userId: string, dto: CreateLeadDto) {
    const lead = await this.model.create({ ...dto, userId });
    await this.workflowsService.runTriggersForEvent(
      userId,
      'lead_created',
      lead,
    );
    return lead;
  }

  async update(userId: string, id: string, dto: UpdateLeadDto) {
    const updated = await this.model
      .findOneAndUpdate({ _id: id, userId }, { $set: dto }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Lead not found');
    return updated;
  }

  async remove(userId: string, id: string) {
    const res = await this.model.deleteOne({ _id: id, userId }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Lead not found');
    return { deleted: true };
  }

  // "Convert to lead" from a message log row — the honest version of
  // capturing a WhatsApp conversation as a prospect: this app has no real
  // inbound webhook, so promotion is a deliberate action on a message the
  // user already sent, not an automatic reaction to an inbound message.
  async promoteFromMessage(userId: string, messageId: string) {
    const message = await this.messageModel
      .findOne({ _id: messageId, userId })
      .exec();
    if (!message) throw new NotFoundException('Message not found');

    const isEmail = message.channel === 'email';
    return this.findOrCreate(userId, {
      name: message.variables?.name || message.to,
      phone: isEmail ? undefined : message.to,
      email: isEmail ? message.to : undefined,
      channel: message.channel,
      sourceMessageId: (message._id as { toString(): string }).toString(),
    });
  }

  // The AI assistant's default behavior: when it judges an inbound message
  // as showing real interest (see AiReplyService's system prompt), that
  // sender is a lead — no workflow has to be built for this to happen.
  // A workflow's action_add_lead node can still run on top of this; both
  // dedupe by phone/email so nothing doubles up.
  async createFromInbound(
    userId: string,
    inbound: { channel: string; from: string; text: string },
  ) {
    const isEmail = inbound.channel === 'email';
    return this.findOrCreate(userId, {
      name: inbound.from,
      phone: isEmail ? undefined : inbound.from,
      email: isEmail ? inbound.from : undefined,
      channel: inbound.channel as Lead['channel'],
      notes: inbound.text,
    });
  }

  private async findOrCreate(
    userId: string,
    fields: {
      name: string;
      phone?: string;
      email?: string;
      channel?: Lead['channel'];
      notes?: string;
      sourceMessageId?: string;
    },
  ) {
    const existing = await this.model
      .findOne({
        userId,
        ...(fields.email ? { email: fields.email } : { phone: fields.phone }),
      })
      .exec();
    if (existing) return existing;

    const lead = await this.model.create({ ...fields, userId });
    await this.workflowsService.runTriggersForEvent(
      userId,
      'lead_created',
      lead,
    );
    return lead;
  }
}
