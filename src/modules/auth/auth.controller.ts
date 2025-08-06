import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login to obtain a JWT token' })
  @ApiResponse({ status: 200, description: 'Successfully logged in', schema: { example: { access_token: 'eyJ...' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() req: { username: string; password: string }) {
    this.logger.log(`Login attempt for user: ${req.username}`);
    const user = await this.authService.validateUser(req.username, req.password);
    if (!user) {
      this.logger.warn(`Login failed for user: ${req.username}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }
}