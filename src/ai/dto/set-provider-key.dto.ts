import { IsNotEmpty, IsString } from 'class-validator';

export class SetProviderKeyDto {
  @IsString()
  @IsNotEmpty()
  key: string;
}
