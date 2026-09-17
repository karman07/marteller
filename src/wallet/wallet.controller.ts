import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { AddBalanceDto } from './dto/add-balance.dto';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getBalance(@Req() req: Request & { userId: string }) {
    return this.walletService.getBalance(req.userId);
  }

  @Get('transactions')
  listTransactions(
    @Req() req: Request & { userId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.listTransactions(req.userId, Number(page) || 1, Number(limit) || 20);
  }

  @Post('add-balance')
  addBalance(@Req() req: Request & { userId: string }, @Body() dto: AddBalanceDto) {
    return this.walletService.addBalance(req.userId, dto.amountPaise);
  }
}
