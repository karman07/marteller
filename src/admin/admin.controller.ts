import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { join } from 'path';
import type { Request, Response } from 'express';
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
import { SubmitVerificationDto } from '../verification/dto/submit-verification.dto';
import {
  VERIFICATION_FILE_FIELDS,
  VERIFICATION_MULTER_OPTIONS,
  VERIFICATION_UPLOAD_DIR,
  buildVerificationDocuments,
  parseFieldValuesJson,
} from '../verification/verification-upload.util';
import type { UploadedVerificationFiles } from '../verification/verification-upload.util';
import { DocumentRequestsService } from '../document-requests/document-requests.service';
import { CreateDocumentRequestDto } from '../document-requests/dto/create-document-request.dto';
import { AnalyticsService } from '../analytics/analytics.service';
import { PlansService } from '../billing/plans.service';
import { SubscriptionsService } from '../billing/subscriptions.service';
import { CreatePlanDto } from '../billing/dto/create-plan.dto';
import { UpdatePlanDto } from '../billing/dto/update-plan.dto';
import { UsersService } from '../users/users.service';
import { CreateTeamMemberDto } from '../users/dto/create-team-member.dto';
import { SetPasswordDto } from '../users/dto/set-password.dto';
import { SmsCredentialsService } from '../sms-credentials/sms-credentials.service';
import { UpsertSmsCredentialDto } from '../sms-credentials/dto/upsert-sms-credential.dto';
import { PricingService } from '../messages/pricing.service';
import { UpdateRateCardDto } from '../messages/dto/update-rate-card.dto';
import { WalletService } from '../wallet/wallet.service';
import { AdminAddBalanceDto } from '../wallet/dto/admin-add-balance.dto';
import { StaffActivityService } from '../staff-activity/staff-activity.service';

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
    private readonly usersService: UsersService,
    private readonly smsCredentialsService: SmsCredentialsService,
    private readonly pricingService: PricingService,
    private readonly walletService: WalletService,
    private readonly staffActivityService: StaffActivityService,
  ) {}

  @Get('applicants')
  listApplicants() {
    return this.salesService.listApplicants();
  }

  // The unified board — leads and customers together, one pipeline. This
  // is what /applicants (both apps) actually renders now; listApplicants()
  // above stays for anything that only ever wanted real accounts.
  @Get('pipeline')
  listPipeline() {
    return this.salesService.listPipeline();
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
  async reviewVerification(
    @Param('userId') userId: string,
    @Body() dto: ReviewApplicationDto,
    @Req() req: Request & { userId: string },
  ) {
    const record = await this.salesService.reviewVerification(userId, dto);
    this.staffActivityService.log(
      req.userId,
      'verification_reviewed',
      `${dto.status === 'verified' ? 'Approved' : 'Rejected'} business verification`,
      { targetUserId: userId },
    );
    return record;
  }

  // Admin uploading verification documents on an applicant's behalf — see
  // SalesController's identical route for why this exists.
  @Post('applicants/:userId/verification/documents')
  @UseInterceptors(FileFieldsInterceptor(VERIFICATION_FILE_FIELDS, VERIFICATION_MULTER_OPTIONS))
  submitVerificationOnBehalf(
    @Param('userId') userId: string,
    @Body() dto: SubmitVerificationDto,
    @UploadedFiles() files: UploadedVerificationFiles,
  ) {
    const documents = buildVerificationDocuments(files);
    const fieldValues = parseFieldValuesJson(dto.fieldValuesJson);
    return this.salesService.submitVerificationOnBehalf(userId, fieldValues, documents);
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

  // Admin crediting a customer's wallet directly — separate from a Plan's
  // monthly platform fee (see RateCard/Plan schema comments): this is the
  // pay-as-you-go balance that funds messages beyond a plan's allowance
  // (or all of them, for a plan-less account). The customer can also do
  // this themselves from their own dashboard — this is the same action,
  // just staff-initiated, and shows up as such in their transaction
  // history.
  @Post('applicants/:userId/wallet/add-balance')
  async addBalance(
    @Param('userId') userId: string,
    @Body() dto: AdminAddBalanceDto,
    @Req() req: Request & { userId: string },
  ) {
    const result = await this.walletService.addBalance(
      userId,
      dto.amountPaise,
      'Balance added by admin',
    );
    this.staffActivityService.log(
      req.userId,
      'balance_added',
      `Added ₹${(dto.amountPaise / 100).toFixed(2)} to wallet balance`,
      { targetUserId: userId },
    );
    return result;
  }

  // Per-user Fast2SMS config — staff-provisioned, not self-service (see
  // SmsCredential schema comment). Identical to SalesController's route.
  @Get('applicants/:userId/sms-credential')
  getSmsCredential(@Param('userId') userId: string) {
    return this.smsCredentialsService.findByUserId(userId);
  }

  @Put('applicants/:userId/sms-credential')
  async setSmsCredential(
    @Param('userId') userId: string,
    @Body() dto: UpsertSmsCredentialDto,
    @Req() req: Request & { userId: string },
  ) {
    const credential = await this.smsCredentialsService.upsert(userId, dto, req.userId);
    this.staffActivityService.log(req.userId, 'sms_configured', 'Configured SMS provider', {
      targetUserId: userId,
    });
    return credential;
  }

  @Delete('applicants/:userId/sms-credential')
  removeSmsCredential(@Param('userId') userId: string) {
    return this.smsCredentialsService.remove(userId);
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
  async createLead(@Body() dto: CreateSalesLeadDto, @Req() req: Request & { userId: string }) {
    const lead = await this.salesLeadsService.create(dto);
    this.staffActivityService.log(req.userId, 'lead_created', `Created lead "${lead.name}"`, {
      targetLeadId: (lead._id as { toString(): string }).toString(),
    });
    return lead;
  }

  @Patch('leads/:id')
  async updateLead(
    @Param('id') id: string,
    @Body() dto: UpdateSalesLeadDto,
    @Req() req: Request & { userId: string },
  ) {
    const lead = await this.salesLeadsService.update(id, dto);
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

  @Delete('leads/:id')
  removeLead(@Param('id') id: string) {
    return this.salesLeadsService.remove(id);
  }

  @Post('leads/:id/promote')
  async promoteLead(
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
  @Post('leads/:id/credentials')
  async issueLeadCredentials(@Param('id') id: string, @Req() req: Request & { userId: string }) {
    const result = await this.salesLeadsService.issueCredentials(id);
    this.staffActivityService.log(
      req.userId,
      'credentials_issued',
      `Issued login credentials for ${result.email}`,
      { targetLeadId: id, targetUserId: result.userId },
    );
    return result;
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

  // Per-channel message pricing — admin-only (a platform financial
  // setting, like revenue). Deliberately separate from Plan
  // (priceMonthlyPaise is the platform access fee; this is what a
  // message actually costs against the wallet). Any rate can be 0 to
  // make that channel free; changes only affect sends from this point
  // forward, see RateCard schema comment.
  @Get('pricing')
  getPricing() {
    return this.pricingService.getRateCard();
  }

  @Patch('pricing')
  updatePricing(@Body() dto: UpdateRateCardDto) {
    return this.pricingService.updateRateCard(dto);
  }

  @Get('sales-team')
  listSalesTeam() {
    return this.usersService.listByRole('sales');
  }

  // Provisions a real login (Firebase + Mongo, role 'sales') and hands back
  // a temporary password immediately — unlike SalesLeadsService.promote(),
  // there's no verification gate for staff accounts. No email/SMS delivery
  // is wired up, so the admin passes the credentials along themselves.
  // dto.password lets admin choose the login instead of getting a
  // generated one.
  @Post('sales-team')
  async createSalesTeamMember(
    @Body() dto: CreateTeamMemberDto,
    @Req() req: Request & { userId: string },
  ) {
    const result = await this.usersService.createTeamMember(
      dto.email,
      dto.name,
      'sales',
      dto.password,
    );
    this.staffActivityService.log(
      req.userId,
      'sales_rep_created',
      `Added ${dto.name} to the sales team`,
      { targetUserId: (result.user._id as { toString(): string }).toString() },
    );
    return result;
  }

  // Resets an existing sales rep's password — same "admin can set it
  // themselves, or leave it to generate one" as account creation.
  @Post('sales-team/:userId/password')
  async setSalesTeamPassword(
    @Param('userId') userId: string,
    @Body() dto: SetPasswordDto,
    @Req() req: Request & { userId: string },
  ) {
    const result = await this.usersService.setPassword(userId, dto.password);
    this.staffActivityService.log(req.userId, 'password_reset', `Reset password for ${result.email}`, {
      targetUserId: userId,
    });
    return result;
  }

  // What the sales team has actually been doing — leads worked,
  // verification decisions, credentials issued, balances added, SMS
  // configured. Admin-only, same reasoning as revenue/funnel above.
  @Get('sales-activity')
  listSalesActivity() {
    return this.staffActivityService.listRecent(150);
  }
}
