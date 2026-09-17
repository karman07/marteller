import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InboxService } from './inbox.service';
import { SimulateInboundDto } from './dto/simulate-inbound.dto';
import type { Channel } from '../templates/schemas/template.schema';

@UseGuards(JwtAuthGuard)
@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  list(@Req() req: Request & { userId: string }) {
    return this.inboxService.list(req.userId);
  }

  @Post('simulate')
  simulate(
    @Req() req: Request & { userId: string },
    @Body() dto: SimulateInboundDto,
  ) {
    return this.inboxService.simulate(req.userId, dto);
  }

  @Get('conversations/:channel')
  listConversations(
    @Req() req: Request & { userId: string },
    @Param('channel') channel: Channel,
  ) {
    return this.inboxService.listConversations(req.userId, channel);
  }

  @Get('conversations/:channel/:contact')
  getConversation(
    @Req() req: Request & { userId: string },
    @Param('channel') channel: Channel,
    @Param('contact') contact: string,
  ) {
    return this.inboxService.getConversation(req.userId, channel, contact);
  }

  @Post(':id/approve-reply')
  approveReply(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    return this.inboxService.approveReply(req.userId, id);
  }

  @Post(':id/reject-reply')
  rejectReply(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    return this.inboxService.rejectReply(req.userId, id);
  }
}
