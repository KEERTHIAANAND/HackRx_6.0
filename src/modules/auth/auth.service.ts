import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private jwtService: JwtService) {}

  async validateUser(username: string, pass: string): Promise<any> {
    if (username === 'testuser' && pass === 'testpass') {
      const user = { userId: 1, username: 'testuser', roles: ['user'] };
      this.logger.log(`User '${username}' validated.`);
      return user;
    }
    this.logger.warn(`Failed validation attempt for user: ${username}`);
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId, roles: user.roles };
    this.logger.log(`Generating JWT for user: ${user.username}`);
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}