import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Headers,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlansService } from './plans.service';
import { SubscriptionsService, RazorpayWebhookPayload } from './subscriptions.service';
import { RazorpayService } from './razorpay.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly razorpayService: RazorpayService,
  ) {}

  // Public — the pricing page reads this for logged-out visitors too.
  @Get('plans')
  listPlans() {
    return this.plansService.listActive();
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(@Req() req: Request & { userId: string }, @Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(req.userId, dto.planId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  getMySubscription(@Req() req: Request & { userId: string }) {
    return this.subscriptionsService.getForUser(req.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancel(@Req() req: Request & { userId: string }, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionsService.cancel(req.userId, dto.immediately ?? false);
  }

  // Razorpay calls this directly — no JwtAuthGuard, authenticity is
  // established purely by the HMAC signature below, verified against the
  // exact raw request bytes (see main.ts's rawBody:true app option and
  // RazorpayService.verifyWebhookSignature). Must always return quickly;
  // Razorpay retries on anything but a 2xx, and the X-Razorpay-Event-Id
  // header handles dedup on the retry (see processWebhookEvent).
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-razorpay-event-id') eventId: string,
    @Body() body: RazorpayWebhookPayload & { event?: string },
  ) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    const valid = this.razorpayService.verifyWebhookSignature(req.rawBody.toString(), signature);
    if (!valid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (!eventId || !body.event) {
      throw new BadRequestException('Malformed webhook payload');
    }

    await this.subscriptionsService.processWebhookEvent(eventId, body.event, body);
    return { received: true };
  }
}
