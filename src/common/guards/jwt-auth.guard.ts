import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(`JWT authentication failed: ${err?.message || info?.message || 'Unknown reason'}`);
      throw err || new UnauthorizedException('Authentication failed. Invalid or expired token.');
    }
    this.logger.debug(`JWT authenticated user: ${user.username}`);
    return user;
  }
}