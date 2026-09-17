import { IsMongoId } from 'class-validator';

export class SubscribeDto {
  @IsMongoId()
  planId: string;
}
