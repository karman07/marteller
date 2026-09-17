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
import { SalesGuard } from './sales.guard';
import { SalesService } from './sales.service';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
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

  // Per-user Fast2SMS config — staff-provisioned, not self-service (see
  // SmsCredential schema comment). Every sales rep and admin can view/set
  // this identically, same as the rest of this controller.
  @Get('applicants/:userId/sms-credential')
  getSmsCredential(@Param('userId') userId: string) {
    return this.smsCredentialsService.findByUserId(userId);
  }

  @Put('applicants/:userId/sms-credential')
  setSmsCredential(
    @Param('userId') userId: string,
    @Body() dto: UpsertSmsCredentialDto,
    @Req() req: Request & { userId: string },
  ) {
    return this.smsCredentialsService.upsert(userId, dto, req.userId);
  }

  @Delete('applicants/:userId/sms-credential')
  removeSmsCredential(@Param('userId') userId: string) {
    return this.smsCredentialsService.remove(userId);
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
}
