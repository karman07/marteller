import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateIf((dto: CreateContactDto) => !dto.email)
  @IsString()
  @IsNotEmpty({ message: 'Provide a phone number or an email address' })
  phone?: string;

  @ValidateIf((dto: CreateContactDto) => !dto.phone)
  @IsEmail({}, { message: 'Provide a phone number or a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  list?: string;
}
