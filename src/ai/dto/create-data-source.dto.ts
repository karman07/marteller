import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateDataSourceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['file', 'text', 'url'])
  type: 'file' | 'text' | 'url';
}
