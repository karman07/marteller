import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import type { Channel, WhatsappCategory } from './schemas/template.schema';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'templates');
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  list(
    @Req() req: Request & { userId: string },
    @Query('channel') channel?: Channel,
    @Query('category') category?: WhatsappCategory,
  ) {
    return this.templatesService.list(req.userId, channel, category);
  }

  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('Only PNG, JPEG, or WebP images are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No image uploaded');
    return { url: `/uploads/templates/${file.filename}` };
  }

  @Get(':id')
  findOne(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.templatesService.findOne(req.userId, id);
  }

  @Post()
  create(@Req() req: Request & { userId: string }, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(req.userId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(req.userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.templatesService.remove(req.userId, id);
  }
}
