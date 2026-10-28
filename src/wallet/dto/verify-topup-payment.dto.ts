import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyTopupPaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}
