import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDocumentRequestDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsString()
  note?: string;
}
