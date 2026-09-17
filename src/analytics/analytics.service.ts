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
}
