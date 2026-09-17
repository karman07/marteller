import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  list(@Req() req: Request & { userId: string }) {
    return this.leadsService.list(req.userId);
  }

  @Post()
  create(@Req() req: Request & { userId: string }, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(req.userId, dto);
  }

  @Post('from-message/:messageId')
  promoteFromMessage(
    @Req() req: Request & { userId: string },
    @Param('messageId') messageId: string,
  ) {
    return this.leadsService.promoteFromMessage(req.userId, messageId);
  }

  @Patch(':id')
  update(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(req.userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.leadsService.remove(req.userId, id);
  }
}
