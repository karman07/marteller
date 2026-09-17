import { IsNotEmpty, IsString } from 'class-validator';

export class CreateContactListDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
