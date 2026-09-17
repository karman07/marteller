import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { CreateDataSourceDto } from './dto/create-data-source.dto';
import { SetProviderKeyDto } from './dto/set-provider-key.dto';
import type { AiProvider } from './schemas/ai-config.schema';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('models')
  models() {
    return this.aiService.models();
  }

  @Get('config')
  getConfig(@Req() req: Request & { userId: string }) {
    return this.aiService.getConfig(req.userId);
  }

  @Get('analytics/summary')
  analyticsSummary(
    @Req() req: Request & { userId: string },
    @Query('days') days?: string,
  ) {
    return this.aiService.analyticsSummary(req.userId, Number(days) || 14);
  }

  @Patch('config')
  updateConfig(
    @Req() req: Request & { userId: string },
    @Body() dto: UpdateAiConfigDto,
  ) {
    return this.aiService.updateConfig(req.userId, dto);
  }

  @Put('keys/:provider')
  setProviderKey(
    @Req() req: Request & { userId: string },
    @Param('provider') provider: AiProvider,
    @Body() dto: SetProviderKeyDto,
  ) {
    return this.aiService.setProviderKey(req.userId, provider, dto.key);
  }

  @Delete('keys/:provider')
  removeProviderKey(
    @Req() req: Request & { userId: string },
    @Param('provider') provider: AiProvider,
  ) {
    return this.aiService.removeProviderKey(req.userId, provider);
  }

  @Post('data-sources')
  addDataSource(
    @Req() req: Request & { userId: string },
    @Body() dto: CreateDataSourceDto,
  ) {
    return this.aiService.addDataSource(req.userId, dto);
  }

  @Delete('data-sources/:id')
  removeDataSource(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    return this.aiService.removeDataSource(req.userId, id);
  }
}
