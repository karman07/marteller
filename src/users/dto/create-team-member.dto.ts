import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTeamMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  name: string;

  // Left unset, a random temp password is generated instead — admin can
  // choose to set a specific one up front rather than relaying a
  // generated one.
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
