import { IsInt, Max, Min } from 'class-validator';

export class AddBalanceDto {
  @IsInt()
  @Min(100) // ₹1 minimum
  @Max(10_000_00) // ₹10,000 max per top-up
  amountPaise: number;
}
