import { IsNotEmpty, IsString } from 'class-validator';

export class SyncTokenDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
