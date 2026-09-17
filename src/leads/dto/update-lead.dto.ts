import { IsIn, IsOptional, IsString } from 'class-validator';
import { LEAD_STATUSES, type LeadStatus } from '../schemas/lead.schema';
import {
  CHANNELS,
  type Channel,
} from '../../templates/schemas/template.schema';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsIn(CHANNELS)
  channel?: Channel;

  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
