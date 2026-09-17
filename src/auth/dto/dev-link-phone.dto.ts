import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class DevLinkPhoneDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'phoneNumber must be in E.164 format' })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
