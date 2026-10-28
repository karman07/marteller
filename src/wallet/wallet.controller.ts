import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { AddBalanceDto } from './dto/add-balance.dto';
import { CreateTopupOrderDto } from './dto/create-topup-order.dto';
import { VerifyTopupPaymentDto } from './dto/verify-topup-payment.dto';

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

  // Real self-service top-up: create a Razorpay order, then verify the
  // payment signature before crediting. See WalletService for both halves.
  @Post('topup/order')
  createTopupOrder(@Req() req: Request & { userId: string }, @Body() dto: CreateTopupOrderDto) {
    return this.walletService.createTopupOrder(req.userId, dto.amountPaise);
  }

  @Post('topup/verify')
  verifyTopup(@Req() req: Request & { userId: string }, @Body() dto: VerifyTopupPaymentDto) {
    return this.walletService.verifyAndCreditTopup(req.userId, dto.orderId, dto.paymentId, dto.signature);
  }

  // Dev-only instant credit, no payment — see WalletService.devAddBalance.
  @Post('dev-add-balance')
  devAddBalance(@Req() req: Request & { userId: string }, @Body() dto: AddBalanceDto) {
    return this.walletService.devAddBalance(req.userId, dto.amountPaise);
  }
}
