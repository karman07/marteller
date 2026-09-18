import { IsInt, Max, Min } from 'class-validator';

// Separate from AddBalanceDto (the self-service top-up, capped at
// ₹10,000/call) — a staff-initiated credit is trusted and often for a
// larger, one-off reason (goodwill credit, enterprise deal), so it gets a
// much higher ceiling.
export class AdminAddBalanceDto {
  @IsInt()
  @Min(100) // ₹1 minimum
  @Max(1_000_000_00) // ₹10,00,000 max per top-up
  amountPaise: number;
}
