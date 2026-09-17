import { IsNotEmpty, IsString } from 'class-validator';

// Arrives as a JSON-stringified Record<string, string> because this rides
// alongside file uploads in the same multipart request — the controller
// parses it before handing values to VerificationService.
export class SubmitVerificationDto {
  @IsString()
  @IsNotEmpty()
  fieldValuesJson: string;
}
