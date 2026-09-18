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
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalesGuard } from './sales.guard';
import { SalesLeadsService } from './sales-leads.service';
import { StaffActivityService } from '../staff-activity/staff-activity.service';
import {
  CreateSalesLeadDto,
  PromoteLeadDto,
  UpdateSalesLeadDto,
} from './dto/sales-lead.dto';

@UseGuards(JwtAuthGuard, SalesGuard)
@Controller('sales/leads')
export class SalesLeadsController {
  constructor(
    private readonly salesLeadsService: SalesLeadsService,
    private readonly staffActivityService: StaffActivityService,
  ) {}

  @Get()
  list() {
    return this.salesLeadsService.list();
  }

  @Post()
  async create(@Body() dto: CreateSalesLeadDto, @Req() req: Request & { userId: string }) {
    const lead = await this.salesLeadsService.create(dto);
    this.staffActivityService.log(req.userId, 'lead_created', `Created lead "${lead.name}"`, {
      targetLeadId: (lead._id as { toString(): string }).toString(),
    });
    return lead;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSalesLeadDto,
    @Req() req: Request & { userId: string },
  ) {
    const lead = await this.salesLeadsService.update(id, dto);
    // Only the moves worth surfacing in an activity feed — every minor
    // notes edit would drown those out.
    if (dto.assignedToUserId !== undefined) {
      const summary = dto.assignedToUserId
        ? `Assigned lead "${lead.name}" to a teammate`
        : `Unassigned lead "${lead.name}"`;
      this.staffActivityService.log(req.userId, 'lead_reassigned', summary, { targetLeadId: id });
    } else if (dto.status) {
      this.staffActivityService.log(
        req.userId,
        'lead_status_changed',
        `Moved lead "${lead.name}" to ${dto.status.replace(/_/g, ' ')}`,
        { targetLeadId: id },
      );
    }
    return lead;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesLeadsService.remove(id);
  }

  @Post(':id/promote')
  async promote(
    @Param('id') id: string,
    @Body() dto: PromoteLeadDto,
    @Req() req: Request & { userId: string },
  ) {
    const result = await this.salesLeadsService.promote(id, dto);
    this.staffActivityService.log(
      req.userId,
      'lead_promoted',
      `Started verification for "${result.lead.name}" (${result.email})`,
      { targetLeadId: id, targetUserId: result.userId },
    );
    return result;
  }

  // Only reachable once the linked user's verification is approved (the
  // lead is 'converted' by then) — see SalesLeadsService.issueCredentials.
  @Post(':id/credentials')
  async issueCredentials(@Param('id') id: string, @Req() req: Request & { userId: string }) {
    const result = await this.salesLeadsService.issueCredentials(id);
    this.staffActivityService.log(
      req.userId,
      'credentials_issued',
      `Issued login credentials for ${result.email}`,
      { targetLeadId: id, targetUserId: result.userId },
    );
    return result;
  }
}
