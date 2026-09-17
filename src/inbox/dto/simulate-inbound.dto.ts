import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import {
  CHANNELS,
  type Channel,
} from '../../templates/schemas/template.schema';

export class SimulateInboundDto {
  @IsIn(CHANNELS)
  channel: Channel;

  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}
