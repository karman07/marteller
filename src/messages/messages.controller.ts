import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { PricingService } from './pricing.service';
import { SendMessageDto } from './dto/send-message.dto';
import type { Channel } from '../templates/schemas/template.schema';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly pricingService: PricingService,
  ) {}

  @Post('send')
  send(@Req() req: Request & { userId: string }, @Body() dto: SendMessageDto) {
    return this.messagesService.send(req.userId, dto);
  }

  @Get()
  list(
    @Req() req: Request & { userId: string },
    @Query('channel') channel?: Channel,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.list(req.userId, channel, Number(page) || 1, Number(limit) || 20);
  }

  @Get('summary')
  summary(
    @Req() req: Request & { userId: string },
    @Query('channel') channel?: Channel,
    @Query('days') days?: string,
  ) {
    return this.messagesService.summary(req.userId, channel, Number(days) || 14);
  }

  @Get('pricing')
  pricing() {
    return this.pricingService.rateCard();
  }

  // Dev-only: see MessagesService.seedDemoData for the gating check.
  @Post('seed-demo')
  seedDemo(@Req() req: Request & { userId: string }) {
    return this.messagesService.seedDemoData(req.userId);
  }
}
