import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
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
import { AuthService } from './auth.service';
import { SyncTokenDto } from './dto/sync-token.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { DevLinkPhoneDto } from './dto/dev-link-phone.dto';
import { DevSetRoleDto } from './dto/dev-set-role.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const PHOTO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'profile-photos');
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Called after email/password or Google sign-in, and again after linking
  // a phone number, to find-or-create the backend user and issue our JWT.
  @Post('sync')
  sync(@Body() dto: SyncTokenDto) {
    return this.authService.syncFromToken(dto.idToken);
  }

  // Dev-only shortcut: stamps a phone number onto the already-authenticated
  // user without real Firebase SMS/reCAPTCHA. Hard-disabled unless
  // NODE_ENV !== 'production' AND DEV_PHONE_AUTH_BYPASS=true.
  @UseGuards(JwtAuthGuard)
  @Patch('dev-link-phone')
  devLinkPhone(@Req() req: Request & { userId: string }, @Body() dto: DevLinkPhoneDto) {
    return this.authService.devLinkPhone(req.userId, dto.phoneNumber, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('complete-profile')
  completeProfile(
    @Req() req: Request & { userId: string },
    @Body() dto: CompleteProfileDto,
  ) {
    return this.authService.completeProfile(req.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: PHOTO_UPLOAD_DIR,
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
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No photo uploaded');
    return { url: `/uploads/profile-photos/${file.filename}` };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('photo')
  updatePhoto(@Req() req: Request & { userId: string }, @Body() dto: UpdatePhotoDto) {
    return this.authService.updatePhoto(req.userId, dto.photoUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('skip-onboarding')
  skipOnboarding(@Req() req: Request & { userId: string }) {
    return this.authService.skipOnboarding(req.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { userId: string }) {
    return this.authService.me(req.userId);
  }

  // Dev-only: promotes the caller's own account to the sales role, since
  // there's no production admin UI for granting it yet. Hard-disabled unless
  // NODE_ENV !== 'production' AND DEV_PHONE_AUTH_BYPASS=true.
  @UseGuards(JwtAuthGuard)
  @Patch('dev-set-role')
  devSetRole(
    @Req() req: Request & { userId: string },
    @Body() dto: DevSetRoleDto,
  ) {
    return this.authService.devSetRole(req.userId, dto.role);
  }
}
