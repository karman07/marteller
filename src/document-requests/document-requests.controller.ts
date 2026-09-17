import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentRequestsService } from './document-requests.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'document-requests');

@UseGuards(JwtAuthGuard)
@Controller('document-requests')
export class DocumentRequestsController {
  constructor(
    private readonly documentRequestsService: DocumentRequestsService,
  ) {}

  @Get()
  list(@Req() req: Request & { userId: string }) {
    return this.documentRequestsService.listForUser(req.userId);
  }

  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.documentRequestsService.fulfil(req.userId, id, {
      fileName: file.originalname,
      storedFileName: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedAt: new Date(),
    });
  }
}
