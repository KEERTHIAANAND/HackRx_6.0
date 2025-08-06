import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
    this.logger.log('JWT Strategy initialized.');
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      this.logger.warn('Invalid JWT payload: Missing user ID.');
      throw new UnauthorizedException('Invalid token payload.');
    }
    this.logger.debug(`JWT validated for user ID: ${payload.sub}`);
    return { userId: payload.sub, username: payload.username, roles: payload.roles };
  }
}