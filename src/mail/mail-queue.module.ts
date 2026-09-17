import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

export const MAIL_OUTBOUND_QUEUE = 'mail-outbound';

// The one piece of infrastructure this codebase didn't have before Mail:
// no queue/background-job system existed anywhere (see MessagesService,
// fully synchronous). BullMQ + Redis handles pre-send validation retries
// and reliable handoff to the local MTA; actual internet-delivery retries
// are Postfix's job, not this queue's (see MailTransportService).
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: new IORedis(
          config.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379',
          {
            maxRetriesPerRequest: null,
          },
        ),
      }),
    }),
    BullModule.registerQueue({
      name: MAIL_OUTBOUND_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
        removeOnFail: { age: 30 * 24 * 3600 },
      },
    }),
  ],
  exports: [BullModule],
})
export class MailQueueModule {}
