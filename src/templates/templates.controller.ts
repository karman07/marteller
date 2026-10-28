import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { GenerateTemplateDto } from './dto/generate-template.dto';
import type { Channel, WhatsappCategory } from './schemas/template.schema';
import { WhatsAppTemplateMappingService } from '../whatsapp-credentials/whatsapp-template-mapping.service';
import { WhatsAppTemplateSubmissionService } from '../whatsapp-credentials/whatsapp-template-submission.service';
import { AiReplyService } from '../ai/ai-reply.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'templates');
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly whatsappTemplateMappingService: WhatsAppTemplateMappingService,
    private readonly whatsappTemplateSubmissionService: WhatsAppTemplateSubmissionService,
    private readonly aiReplyService: AiReplyService,
  ) {}

  // Drafts a template from a prompt — doesn't save it, the caller reviews
  // and saves via the normal POST below. Consumes this tenant's AI
  // generation allowance (see AiReplyService.generateTemplate); the admin
  // equivalent for the shared system library is on AdminController, which
  // is exempt from that check (admin has no Plan to draw one from).
  @Post('generate')
  generate(@Req() req: Request & { userId: string }, @Body() dto: GenerateTemplateDto) {
    return this.aiReplyService.generateTemplate(req.userId, dto);
  }

  // Read-only approval status for this tenant's WhatsApp templates — see
  // WhatsAppTemplateMapping schema comment for why this is per-tenant and
  // staff-handled, not something the tenant sets themselves. Lazily
  // creates a 'pending' record for any WhatsApp template that doesn't
  // have one yet (own or shared), so opening this list is what puts a
  // freshly-created or newly-seen template into the staff queue.
  // Registered before ':id' routes so "whatsapp-approval-status" isn't
  // parsed as an id.
  @Get('whatsapp-approval-status')
  async listWhatsappApprovalStatus(@Req() req: Request & { userId: string }) {
    const whatsappTemplates = await this.templatesService.list(req.userId, 'whatsapp');
    await Promise.all(
      whatsappTemplates.map((t) =>
        this.whatsappTemplateSubmissionService.ensurePendingAndSubmit(req.userId, t),
      ),
    );
    return this.whatsappTemplateMappingService.listStatusesForUser(req.userId);
  }

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
  async create(@Req() req: Request & { userId: string }, @Body() dto: CreateTemplateDto) {
    const template = await this.templatesService.create(req.userId, dto);
    if (template.channel === 'whatsapp') {
      await this.whatsappTemplateSubmissionService.ensurePendingAndSubmit(req.userId, template);
    }
    return template;
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
  async remove(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    const result = await this.templatesService.remove(req.userId, id);
    await this.whatsappTemplateMappingService.removeMapping(req.userId, id);
    return result;
  }
}
