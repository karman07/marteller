import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  list(@Req() req: Request & { userId: string }) {
    return this.apiKeysService.list(req.userId);
  }

  @Post()
  create(
    @Req() req: Request & { userId: string },
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.create(req.userId, dto.name);
  }

  @Delete(':id')
  remove(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.apiKeysService.remove(req.userId, id);
  }
}
