import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  WORKFLOW_NODE_TYPES,
  type WorkflowNodeType,
} from '../schemas/workflow.schema';

export class WorkflowNodePositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class WorkflowNodeDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsIn(WORKFLOW_NODE_TYPES)
  type: WorkflowNodeType;

  @ValidateNested()
  @Type(() => WorkflowNodePositionDto)
  position: WorkflowNodePositionDto;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
