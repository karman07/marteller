import { IsIn, IsOptional, IsString } from 'class-validator';
import { SALES_STAGES, type SalesStage } from '../../users/schemas/user.schema';

export class UpdateStageDto {
  @IsIn(SALES_STAGES)
  salesStage: SalesStage;

  @IsOptional()
  @IsString()
  salesNotes?: string;
}
