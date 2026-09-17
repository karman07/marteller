import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../users/users.service';

// Runs after JwtAuthGuard (which sets request.userId) — checked as a
// separate guard rather than folded into JwtAuthGuard so every other
// controller stays role-agnostic.
@Injectable()
export class SalesGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { userId: string }>();
    const user = await this.usersService.findById(request.userId);
    if (!user || user.role !== 'sales') {
      throw new ForbiddenException('Sales access only');
    }
    return true;
  }
}
