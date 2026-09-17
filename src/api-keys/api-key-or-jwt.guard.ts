import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';

// Lets an endpoint accept either the dashboard's Bearer JWT or a raw
// `x-api-key` header (for server-to-server integrations) — falls back to
// JwtAuthGuard's exact behavior when no API key header is present, so
// dashboard requests are entirely unaffected by this guard's existence.
@Injectable()
export class ApiKeyOrJwtGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly jwtAuthGuard: JwtAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];

    if (typeof apiKey === 'string' && apiKey.length > 0) {
      const result = await this.apiKeysService.verifyKey(apiKey);
      if (!result) throw new UnauthorizedException('Invalid API key');
      (request as Request & { userId: string }).userId = result.userId;
      return true;
    }

    return this.jwtAuthGuard.canActivate(context);
  }
}
