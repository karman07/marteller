import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WorkflowEdgeDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsString()
  @IsNotEmpty()
  target: string;

  @IsOptional()
  @IsString()
  sourceHandle?: string;
}
