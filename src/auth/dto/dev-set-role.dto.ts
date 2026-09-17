import { IsIn } from 'class-validator';

export class DevSetRoleDto {
  @IsIn(['customer', 'sales'])
  role: 'customer' | 'sales';
}
