import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class UtmDto {
  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  medium?: string;

  @IsOptional()
  @IsString()
  campaign?: string;
}

// One tracked event. userId is deliberately NOT a field here — identity is
// derived server-side from the JWT (OptionalJwtAuthGuard), never trusted
// from the client. See AnalyticsService.track().
class TrackedEventDto {
  @IsString()
  anonymousId: string;

  @IsString()
  sessionId: string;

  @IsIn(['frontend', 'sales', 'admin'])
  app: 'frontend' | 'sales' | 'admin';

  @IsIn(['page_view', 'click', 'feature_interest', 'funnel_step', 'custom'])
  type: 'page_view' | 'click' | 'feature_interest' | 'funnel_step' | 'custom';

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UtmDto)
  utm?: UtmDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// Accepts a small batch per call (not one event per request) — a
// nav-heavy session would otherwise spam the ingest endpoint, and batching
// plays nicely with navigator.sendBeacon flushes on page unload.
export class TrackEventDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TrackedEventDto)
  events: TrackedEventDto[];
}
