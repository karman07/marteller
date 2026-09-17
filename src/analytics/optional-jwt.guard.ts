import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

// Same Bearer-token parsing as JwtAuthGuard (../auth/jwt-auth.guard.ts),
// but never rejects the request — a missing/invalid/expired token just
// leaves request.userId unset. Needed because analytics ingest must work
// for anonymous, pre-auth marketing-site visitors as well as logged-in
// users; identity (when present) still comes only from a verified JWT,
// never from anything client-supplied.
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { userId?: string }>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<{ sub: string }>(
          token,
        );
        request.userId = payload.sub;
      } catch {
        // Invalid/expired token on an ingest call — treat as anonymous
        // rather than rejecting; the event is still worth recording.
      }
    }
    return true;
  }
}
