import {
  BadRequestException,
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
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { Request } from 'express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerificationService } from './verification.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { DevReviewDto } from './dto/dev-review.dto';
import { VerificationDocument } from './schemas/business-verification.schema';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'verification');

type UploadedFileFields = {
  businessProof?: Express.Multer.File[];
  addressProof?: Express.Multer.File[];
};

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
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'businessProof', maxCount: 1 },
        { name: 'addressProof', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: UPLOAD_DIR,
          filename: (_req, file, cb) => {
            cb(null, `${randomUUID()}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
      },
    ),
  )
  submit(
    @Req() req: Request & { userId: string },
    @Body() dto: SubmitVerificationDto,
    @UploadedFiles() files: UploadedFileFields,
  ) {
    const documents: VerificationDocument[] = [];
    for (const [type, list] of Object.entries(files ?? {})) {
      const file = list?.[0];
      if (!file) continue;
      documents.push({
        type,
        fileName: file.originalname,
        storedFileName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedAt: new Date(),
      });
    }

    let fieldValues: Record<string, string>;
    try {
      fieldValues = JSON.parse(dto.fieldValuesJson) as Record<string, string>;
    } catch {
      throw new BadRequestException('fieldValuesJson must be valid JSON');
    }

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
    const filePath = join(UPLOAD_DIR, doc.storedFileName);
    return res.sendFile(filePath, (err) => {
      if (err) throw new NotFoundException('Document not found');
    });
  }
}
