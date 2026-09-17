import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../users/users.service';

// Structural mirror of SalesGuard (../sales/sales.guard.ts) — kept as its
// own separate class rather than widening SalesGuard, so sales reps and
// admins stay two genuinely distinct roles: admin sees everything sales
// sees (via AdminController delegating to SalesService/SalesLeadsService)
// plus platform-wide cost/revenue data that sales must not see.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { userId: string }>();
    const user = await this.usersService.findById(request.userId);
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin access only');
    }
    return true;
  }
}
