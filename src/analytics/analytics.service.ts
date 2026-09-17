import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEvent, UserEventDocument } from './schemas/user-event.schema';
import { TrackEventDto } from './dto/track-event.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(UserEvent.name)
    private readonly userEventModel: Model<UserEventDocument>,
  ) {}

  // Fire-and-forget ingest: insertMany and return immediately, no
  // synchronous heavy processing. userId comes only from the verified JWT
  // (OptionalJwtAuthGuard), never from the request body.
  async track(userId: string | undefined, dto: TrackEventDto) {
    const docs = dto.events.map((e) => ({ ...e, userId }));
    await this.userEventModel.insertMany(docs, { ordered: false });

    // Claim: the first authenticated event for a given anonymousId
    // backfills userId onto that visitor's earlier pre-auth events, so a
    // signup's prior browsing history joins their account. Best-effort —
    // never let a claim failure affect the ingest response.
    if (userId) {
      const anonymousIds = [...new Set(dto.events.map((e) => e.anonymousId))];
      void this.userEventModel
        .updateMany(
          { anonymousId: { $in: anonymousIds }, userId: { $exists: false } },
          { $set: { userId } },
        )
        .exec()
        .catch((err: unknown) =>
          this.logger.warn(
            `Failed to claim anonymous events for user ${userId}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          ),
        );
    }
  }

  // Per-applicant activity timeline for the sales/admin detail pages —
  // raw events (most recent first, capped) plus derived funnel flags so
  // the UI doesn't have to re-derive "did they view pricing" from a raw
  // event list itself.
  async applicantTimeline(userId: string) {
    const events = await this.userEventModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();

    const names = new Set(events.map((e) => e.name));
    return {
      events: events.map((e) => ({
        app: e.app,
        type: e.type,
        name: e.name,
        path: e.path ?? null,
        metadata: e.metadata ?? null,
        createdAt: e.createdAt,
      })),
      funnel: {
        viewedPricing: names.has('pricing_view'),
        startedSignup: names.has('signup_started'),
        completedSignup: names.has('signup_completed'),
        submittedVerification: names.has('verification_submitted'),
        startedCheckout: names.has('checkout_started'),
        completedCheckout: names.has('checkout_completed'),
      },
    };
  }

  // Platform-wide funnel (admin-only) — how many distinct visitors/users
  // reached each named step, in funnel order. Counts by whichever of
  // userId/anonymousId identifies the visitor, so pre-auth and post-auth
  // activity for the same person aren't double-counted once claimed (see
  // track() above).
  async platformFunnel() {
    const steps = [
      'page_view',
      'pricing_view',
      'signup_started',
      'signup_completed',
      'verification_submitted',
      'checkout_started',
      'checkout_completed',
    ] as const;

    const counts = await Promise.all(
      steps.map((name) =>
        this.userEventModel
          .aggregate<{ count: number }>([
            { $match: { name } },
            {
              $group: {
                _id: { $ifNull: ['$userId', '$anonymousId'] },
              },
            },
            { $count: 'count' },
          ])
          .exec(),
      ),
    );

    return steps.map((name, i) => ({
      name,
      count: counts[i][0]?.count ?? 0,
    }));
  }
}
