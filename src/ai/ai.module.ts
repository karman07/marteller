import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AiConfig, AiConfigSchema } from './schemas/ai-config.schema';
import { AiService } from './ai.service';
import { AiReplyService } from './ai-reply.service';
import { AiController } from './ai.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: AiConfig.name, schema: AiConfigSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService, AiReplyService],
  exports: [AiReplyService],
})
export class AiModule {}
