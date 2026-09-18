import { IsOptional, IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  // Left unset, a random temp password is generated instead.
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
