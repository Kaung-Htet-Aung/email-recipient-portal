import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AdminGuard } from './guards/admin.guard';
import { AuthenticatedRequest } from '../common/types/request.types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get current admin user' })
  async getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }
}
