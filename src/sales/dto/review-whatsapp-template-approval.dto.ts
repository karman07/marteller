import { IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class ReviewWhatsappTemplateApprovalDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  // Required when approving — the id the send path will reference.
  @ValidateIf((o: ReviewWhatsappTemplateApprovalDto) => o.status === 'approved')
  @IsString()
  @MinLength(1)
  providerMessageId?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
