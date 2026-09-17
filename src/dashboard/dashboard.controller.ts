import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { VerificationService } from '../verification/verification.service';
import { MessagesService } from '../messages/messages.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly usersService: UsersService,
    private readonly verificationService: VerificationService,
    private readonly messagesService: MessagesService,
  ) {}

  @Get('summary')
  async summary(@Req() req: Request & { userId: string }) {
    const [user, verification, messages] = await Promise.all([
      this.usersService.findById(req.userId),
      this.verificationService.findByUserId(req.userId),
      this.messagesService.summary(req.userId),
    ]);

    return {
      user: user
        ? {
            name: user.name,
            phoneNumber: user.phoneNumber,
            email: user.email,
            country: user.country,
          }
        : null,
      verificationStatus: verification.status,
      messages,
    };
  }
}
