import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { join } from 'path';
import { Request } from 'express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerificationService } from './verification.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { DevReviewDto } from './dto/dev-review.dto';
import {
  VERIFICATION_FILE_FIELDS,
  VERIFICATION_MULTER_OPTIONS,
  VERIFICATION_UPLOAD_DIR,
  buildVerificationDocuments,
  parseFieldValuesJson,
} from './verification-upload.util';
import type { UploadedVerificationFiles } from './verification-upload.util';

@UseGuards(JwtAuthGuard)
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('me')
  me(@Req() req: Request & { userId: string }) {
    return this.verificationService.findByUserId(req.userId);
  }

  @Get('form-fields')
  formFields() {
    return this.verificationService.listFields();
  }

  @Post('submit')
  @UseInterceptors(FileFieldsInterceptor(VERIFICATION_FILE_FIELDS, VERIFICATION_MULTER_OPTIONS))
  submit(
    @Req() req: Request & { userId: string },
    @Body() dto: SubmitVerificationDto,
    @UploadedFiles() files: UploadedVerificationFiles,
  ) {
    const documents = buildVerificationDocuments(files);
    const fieldValues = parseFieldValuesJson(dto.fieldValuesJson);
    return this.verificationService.submit(req.userId, fieldValues, documents);
  }

  @Patch('dev-review')
  devReview(@Req() req: Request & { userId: string }, @Body() dto: DevReviewDto) {
    return this.verificationService.devReview(req.userId, dto);
  }

  @Get('documents/:storedFileName')
  async downloadDocument(
    @Req() req: Request & { userId: string },
    @Param('storedFileName') storedFileName: string,
    @Res() res: Response,
  ) {
    const doc = await this.verificationService.findDocument(req.userId, storedFileName);
    const filePath = join(VERIFICATION_UPLOAD_DIR, doc.storedFileName);
    return res.sendFile(filePath, (err) => {
      if (err) throw new NotFoundException('Document not found');
    });
  }
}
