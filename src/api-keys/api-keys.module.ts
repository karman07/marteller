import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ApiKey, ApiKeySchema } from './schemas/api-key.schema';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeyOrJwtGuard } from './api-key-or-jwt.guard';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: ApiKey.name, schema: ApiKeySchema }]),
  ],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyOrJwtGuard],
  exports: [ApiKeysService, ApiKeyOrJwtGuard],
})
export class ApiKeysModule {}
