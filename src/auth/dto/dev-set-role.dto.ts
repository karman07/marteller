import { IsIn } from 'class-validator';

export class DevSetRoleDto {
  @IsIn(['customer', 'sales', 'admin'])
  role: 'customer' | 'sales' | 'admin';
}
