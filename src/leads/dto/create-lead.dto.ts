import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  CHANNELS,
  type Channel,
} from '../../templates/schemas/template.schema';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
  @IsString()
  notes?: string;
}
