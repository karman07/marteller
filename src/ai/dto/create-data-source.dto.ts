import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateDataSourceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['text', 'url'])
  type: 'text' | 'url';

  // For type 'text': the content itself, stored as-is.
  // For type 'url': the URL to fetch — the backend fetches it and stores
  // the stripped plain text as the actual content (see AiService.addDataSource).
  @IsString()
  @IsNotEmpty()
  content: string;
}
