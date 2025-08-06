import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Authentication failed: Missing or malformed Authorization header.');
      throw new UnauthorizedException('Missing or malformed Authorization header. Expected format: Bearer <API_KEY>');
    }

    const token = authHeader.split(' ')[1];
    const expectedApiKey = this.configService.get<string>('hackRx.apiKey');

    if (!expectedApiKey) {
      this.logger.error('Server configuration error: HACKRX_API_KEY is not set in environment variables.');
      throw new UnauthorizedException('Server configuration error: API key not set.');
    }

    if (token !== expectedApiKey) {
      this.logger.warn(`Authentication failed: Invalid API Key provided (starts with: ${token.substring(0, 10)}...).`);
      throw new UnauthorizedException('Invalid API Key.');
    }

    this.logger.log('API Key authenticated successfully.');
    return true;
  }
}