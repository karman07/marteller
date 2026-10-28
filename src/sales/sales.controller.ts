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
  Query,
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
import { SalesGuard } from './sales.guard';
import { SalesService } from './sales.service';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReviewWhatsappTemplateApprovalDto } from './dto/review-whatsapp-template-approval.dto';
import {
  CreateFieldDto,
  ReorderFieldsDto,
  UpdateFieldDto,
} from '../verification/dto/upsert-field.dto';
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
import { UsersService } from '../users/users.service';
import { SmsCredentialsService } from '../sms-credentials/sms-credentials.service';
import { UpsertSmsCredentialDto } from '../sms-credentials/dto/upsert-sms-credential.dto';
import { WhatsAppCredentialsService } from '../whatsapp-credentials/whatsapp-credentials.service';
import { UpsertWhatsAppCredentialDto } from '../whatsapp-credentials/dto/upsert-whatsapp-credential.dto';
import { WalletService } from '../wallet/wallet.service';
import { AdminAddBalanceDto } from '../wallet/dto/admin-add-balance.dto';
import { StaffActivityService } from '../staff-activity/staff-activity.service';
import { MessagesService } from '../messages/messages.service';
import { SendMessageDto } from '../messages/dto/send-message.dto';
import { TemplatesService } from '../templates/templates.service';
import type { Channel, WhatsappCategory } from '../templates/schemas/template.schema';
import { InboxService } from '../inbox/inbox.service';
import { SubscriptionsService } from '../billing/subscriptions.service';

const DOCUMENT_REQUEST_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'document-requests',
);

@UseGuards(JwtAuthGuard, SalesGuard)
@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly documentRequestsService: DocumentRequestsService,
    private readonly analyticsService: AnalyticsService,
    private readonly usersService: UsersService,
    private readonly smsCredentialsService: SmsCredentialsService,
    private readonly whatsappCredentialsService: WhatsAppCredentialsService,
    private readonly walletService: WalletService,
    private readonly staffActivityService: StaffActivityService,
    private readonly messagesService: MessagesService,
    private readonly templatesService: TemplatesService,
    private readonly inboxService: InboxService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  // The pool of sales reps a lead can be (re)assigned to — every sales rep
  // sees the same list, which is what lets them hand leads to each other
  // rather than only admin doing the assigning.
  @Get('team')
  listTeam() {
    return this.usersService.listByRole('sales');
  }

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

  // Sales uploading verification documents on an applicant's behalf —
  // e.g. a customer sent proof over WhatsApp/email and sales enters it
  // into the system directly, most commonly right after promoting a lead
  // (see SalesLeadsService.promote()'s 'pending_verification' status).
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

  // This applicant's plan + per-channel allowance used so far this period
  // — same as the identical AdminController route, see its comment.
  @Get('applicants/:userId/subscription')
  getApplicantSubscription(@Param('userId') userId: string) {
    return this.subscriptionsService.getForUser(userId);
  }

  // Sales crediting a customer's wallet directly — same action the
  // customer can do themselves from their own dashboard, or admin can do
  // via the identical route on AdminController. Separate from a Plan's
  // platform fee — see RateCard/Plan schema comments.
  @Post('applicants/:userId/wallet/add-balance')
  async addBalance(
    @Param('userId') userId: string,
    @Body() dto: AdminAddBalanceDto,
    @Req() req: Request & { userId: string },
  ) {
    const result = await this.walletService.addBalance(
      userId,
      dto.amountPaise,
      'Credits added by sales team',
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
  // SmsCredential schema comment). Every sales rep and admin can view/set
  // this identically, same as the rest of this controller.
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

  // Per-user Meta WhatsApp Cloud API config — staff-provisioned, not
  // self-service (see WhatsAppCredential schema comment). Every sales rep
  // and admin can view/set this identically, same as the SMS credential
  // routes above.
  @Get('applicants/:userId/whatsapp-credential')
  getWhatsAppCredential(@Param('userId') userId: string) {
    return this.whatsappCredentialsService.findByUserId(userId);
  }

  @Put('applicants/:userId/whatsapp-credential')
  async setWhatsAppCredential(
    @Param('userId') userId: string,
    @Body() dto: UpsertWhatsAppCredentialDto,
    @Req() req: Request & { userId: string },
  ) {
    const credential = await this.whatsappCredentialsService.upsert(userId, dto, req.userId);
    this.staffActivityService.log(req.userId, 'whatsapp_configured', 'Configured WhatsApp provider', {
      targetUserId: userId,
    });
    return credential;
  }

  @Delete('applicants/:userId/whatsapp-credential')
  removeWhatsAppCredential(@Param('userId') userId: string) {
    return this.whatsappCredentialsService.remove(userId);
  }

  @Get('applicants/:userId/events')
  getApplicantEvents(@Param('userId') userId: string) {
    return this.analyticsService.applicantTimeline(userId);
  }

  @Get('form-fields')
  listFormFields() {
    return this.salesService.listFormFields();
  }

  @Post('form-fields')
  createFormField(@Body() dto: CreateFieldDto) {
    return this.salesService.createFormField(dto);
  }

  @Patch('form-fields/reorder')
  reorderFormFields(@Body() dto: ReorderFieldsDto) {
    return this.salesService.reorderFormFields(dto.orderedIds);
  }

  @Patch('form-fields/:id')
  updateFormField(@Param('id') id: string, @Body() dto: UpdateFieldDto) {
    return this.salesService.updateFormField(id, dto);
  }

  @Delete('form-fields/:id')
  deleteFormField(@Param('id') id: string) {
    return this.salesService.deleteFormField(id);
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

  // Read-only browse of the shared system template library (plus this rep's
  // own templates, via the existing $or in TemplatesService.list) — only
  // admin can create/edit/delete system templates (AdminController).
  @Get('templates')
  listTemplates(
    @Req() req: Request & { userId: string },
    @Query('channel') channel?: Channel,
    @Query('category') category?: WhatsappCategory,
  ) {
    return this.templatesService.list(req.userId, channel, category);
  }

  // --- Messaging: per-applicant drill-in — identical service calls to the
  // tenant's own self-service dashboard (see MessagesController/
  // InboxController), just with the target :userId from the route instead
  // of req.userId. Sales has global visibility already (see SalesGuard), so
  // there's no separate cross-tenant overview the way AdminController has. ---

  @Get('applicants/:userId/messages/summary')
  getApplicantMessagesSummary(
    @Param('userId') userId: string,
    @Query('channel') channel?: Channel,
    @Query('days') days?: string,
  ) {
    return this.messagesService.summary(userId, channel, Number(days) || 14);
  }

  @Get('applicants/:userId/messages')
  listApplicantMessages(
    @Param('userId') userId: string,
    @Query('channel') channel?: Channel,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.list(userId, channel, Number(page) || 1, Number(limit) || 20);
  }

  @Post('applicants/:userId/messages/send')
  sendApplicantMessage(@Param('userId') userId: string, @Body() dto: SendMessageDto) {
    return this.messagesService.send(userId, dto);
  }

  @Get('applicants/:userId/inbox/:channel')
  listApplicantInboxConversations(
    @Param('userId') userId: string,
    @Param('channel') channel: Channel,
  ) {
    return this.inboxService.listConversations(userId, channel);
  }

  @Get('applicants/:userId/inbox/:channel/:contact')
  getApplicantInboxConversation(
    @Param('userId') userId: string,
    @Param('channel') channel: Channel,
    @Param('contact') contact: string,
  ) {
    return this.inboxService.getConversation(userId, channel, contact);
  }

  // The queue of WhatsApp templates (across every tenant) waiting on the
  // one manual step our provider genuinely requires — see SalesService
  // comment. Global, not per-applicant, same reasoning as stats()/
  // listPipeline() above.
  @Get('whatsapp-template-approvals')
  listWhatsappTemplateApprovals() {
    return this.salesService.listWhatsappTemplateApprovals();
  }

  @Put('whatsapp-template-approvals/:userId/:templateId')
  async reviewWhatsappTemplateApproval(
    @Param('userId') userId: string,
    @Param('templateId') templateId: string,
    @Body() dto: ReviewWhatsappTemplateApprovalDto,
    @Req() req: Request & { userId: string },
  ) {
    const result = await this.salesService.reviewWhatsappTemplateApproval(
      userId,
      templateId,
      dto,
      req.userId,
    );
    this.staffActivityService.log(
      req.userId,
      'whatsapp_template_reviewed',
      `${dto.status === 'approved' ? 'Approved' : 'Rejected'} a WhatsApp template`,
      { targetUserId: userId },
    );
    return result;
  }
}
