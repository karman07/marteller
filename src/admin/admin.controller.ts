import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { join } from 'path';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { SalesService } from '../sales/sales.service';
import { SalesLeadsService } from '../sales/sales-leads.service';
import { ReviewApplicationDto } from '../sales/dto/review-application.dto';
import { UpdateStageDto } from '../sales/dto/update-stage.dto';
import {
  CreateSalesLeadDto,
  PromoteLeadDto,
  UpdateSalesLeadDto,
} from '../sales/dto/sales-lead.dto';

const VERIFICATION_UPLOAD_DIR = join(process.cwd(), 'uploads', 'verification');

// Deliberately a separate controller/route namespace from SalesController
// (not the same routes reused under an OR-capable guard) so the "admin"
// and "sales" roles stay independently authorized — see AdminGuard's
// comment. Business logic is NOT duplicated: every handler here delegates
// straight to SalesService/SalesLeadsService (exported by SalesModule for
// exactly this reuse).
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly salesService: SalesService,
    private readonly salesLeadsService: SalesLeadsService,
  ) {}

  @Get('applicants')
  listApplicants() {
    return this.salesService.listApplicants();
  }

  @Get('stats')
  stats() {
    return this.salesService.stats();
  }

  @Get('applicants/:userId')
  getApplicant(@Param('userId') userId: string) {
    return this.salesService.getApplicant(userId);
  }

  @Patch('applicants/:userId/verification')
  reviewVerification(
    @Param('userId') userId: string,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.salesService.reviewVerification(userId, dto);
  }

  @Patch('applicants/:userId/stage')
  updateStage(@Param('userId') userId: string, @Body() dto: UpdateStageDto) {
    return this.salesService.updateStage(userId, dto);
  }

  @Get('applicants/:userId/documents/:storedFileName')
  async downloadDocument(
    @Param('userId') userId: string,
    @Param('storedFileName') storedFileName: string,
    @Res() res: Response,
  ) {
    const doc = await this.salesService.getDocument(userId, storedFileName);
    const filePath = join(VERIFICATION_UPLOAD_DIR, doc.storedFileName);
    return res.sendFile(filePath, (err) => {
      if (err) throw new NotFoundException('Document not found');
    });
  }

  @Get('applicants/:userId/usage')
  getUsage(@Param('userId') userId: string) {
    return this.salesService.getUsage(userId);
  }

  @Get('leads')
  listLeads() {
    return this.salesLeadsService.list();
  }

  @Post('leads')
  createLead(@Body() dto: CreateSalesLeadDto) {
    return this.salesLeadsService.create(dto);
  }

  @Patch('leads/:id')
  updateLead(@Param('id') id: string, @Body() dto: UpdateSalesLeadDto) {
    return this.salesLeadsService.update(id, dto);
  }

  @Delete('leads/:id')
  removeLead(@Param('id') id: string) {
    return this.salesLeadsService.remove(id);
  }

  @Post('leads/:id/promote')
  promoteLead(@Param('id') id: string, @Body() dto: PromoteLeadDto) {
    return this.salesLeadsService.promote(id, dto);
  }
}
