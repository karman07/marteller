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
import { DocumentRequestsService } from '../document-requests/document-requests.service';
import { CreateDocumentRequestDto } from '../document-requests/dto/create-document-request.dto';
import { AnalyticsService } from '../analytics/analytics.service';
import { PlansService } from '../billing/plans.service';
import { SubscriptionsService } from '../billing/subscriptions.service';
import { CreatePlanDto } from '../billing/dto/create-plan.dto';
import { UpdatePlanDto } from '../billing/dto/update-plan.dto';

const VERIFICATION_UPLOAD_DIR = join(process.cwd(), 'uploads', 'verification');
const DOCUMENT_REQUEST_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'document-requests',
);

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
    private readonly documentRequestsService: DocumentRequestsService,
    private readonly analyticsService: AnalyticsService,
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
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

  @Get('applicants/:userId/events')
  getApplicantEvents(@Param('userId') userId: string) {
    return this.analyticsService.applicantTimeline(userId);
  }

  // Platform-wide — deliberately not exposed on SalesController, per the
  // decision that sales reps see per-applicant activity but not aggregate
  // platform funnel/financial data.
  @Get('analytics/funnel')
  getFunnel() {
    return this.analyticsService.platformFunnel();
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

  @Get('form-fields')
  listFormFields() {
    return this.salesService.listFormFields();
  }

  @Get('applicants/:userId/document-requests')
  listDocumentRequests(@Param('userId') userId: string) {
    return this.documentRequestsService.listForUser(userId);
  }

  @Post('applicants/:userId/document-requests')
  createDocumentRequest(
    @Param('userId') userId: string,
    @Body() dto: CreateDocumentRequestDto,
  ) {
    return this.documentRequestsService.create(userId, dto);
  }

  @Delete('applicants/:userId/document-requests/:id')
  cancelDocumentRequest(
    @Param('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.documentRequestsService.cancel(userId, id);
  }

  @Get('applicants/:userId/document-requests/:id/file')
  async downloadRequestedFile(
    @Param('userId') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const request = await this.documentRequestsService.findOne(userId, id);
    if (!request.file) {
      throw new NotFoundException('No file uploaded for this request yet');
    }
    const filePath = join(
      DOCUMENT_REQUEST_UPLOAD_DIR,
      request.file.storedFileName,
    );
    return res.sendFile(filePath, (err) => {
      if (err) throw new NotFoundException('File not found');
    });
  }

  // Plan CRUD — admin-only management of subscription tiers. Reads go
  // through PlansService.listAll() (includes inactive plans), unlike the
  // public BillingController.listPlans() which only shows active ones.
  @Get('plans')
  listPlans() {
    return this.plansService.listAll();
  }

  @Post('plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Delete('plans/:id')
  removePlan(@Param('id') id: string) {
    return this.plansService.remove(id);
  }

  // Cost/revenue analytics — admin-only, per the decision that sales reps
  // don't see platform financials (mirrors the analytics/funnel split above).
  @Get('revenue')
  revenue() {
    return this.subscriptionsService.revenueSummary();
  }
}
