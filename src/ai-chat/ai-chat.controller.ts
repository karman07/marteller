import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiChatService } from './ai-chat.service';
import { ChatDto } from './dto/chat.dto';

// Separate module/controller from AiController — see AiChatService's
// top comment for why (TemplatesModule already imports AiModule, so
// AiModule importing TemplatesModule/MessagesModule back to execute tool
// calls would be circular; this module imports all three one-way instead).
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('chat')
  chat(@Req() req: Request & { userId: string }, @Body() dto: ChatDto) {
    return this.aiChatService.chat(req.userId, dto.messages);
  }
}
