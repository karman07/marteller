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
import { SalesGuard } from './sales.guard';
import { SalesService } from './sales.service';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import {
  CreateFieldDto,
  ReorderFieldsDto,
  UpdateFieldDto,
} from '../verification/dto/upsert-field.dto';
import { DocumentRequestsService } from '../document-requests/document-requests.service';
import { CreateDocumentRequestDto } from '../document-requests/dto/create-document-request.dto';

const VERIFICATION_UPLOAD_DIR = join(process.cwd(), 'uploads', 'verification');
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
