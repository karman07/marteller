import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertSmsCredentialDto {
  @IsString()
  @MinLength(1)
  apiKey: string;

  @IsOptional()
  @IsIn(['q', 'dlt'])
  route?: string;

  @IsOptional()
  @IsString()
  senderId?: string;
}
