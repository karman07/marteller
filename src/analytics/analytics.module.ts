import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UserEvent, UserEventSchema } from './schemas/user-event.schema';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { OptionalJwtAuthGuard } from './optional-jwt.guard';

@Module({
  imports: [
    AuthModule, // for JwtModule (OptionalJwtAuthGuard's JwtService)
    MongooseModule.forFeature([
      { name: UserEvent.name, schema: UserEventSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, OptionalJwtAuthGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
