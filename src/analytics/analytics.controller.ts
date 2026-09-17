import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from './optional-jwt.guard';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Deliberately unauthenticated-capable (OptionalJwtAuthGuard) — must
  // work for anonymous marketing-site visitors, not just logged-in users.
  // 204 with no body: callers (navigator.sendBeacon, fire-and-forget
  // fetches) never need a response to act on.
  @UseGuards(OptionalJwtAuthGuard)
  @Post('track')
  @HttpCode(204)
  async track(
    @Req() req: Request & { userId?: string },
    @Body() dto: TrackEventDto,
  ) {
    await this.analyticsService.track(req.userId, dto);
  }
}
