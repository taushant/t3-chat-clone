import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @Public()
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({
        status: 201,
        description: 'User registered successfully',
        schema: {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        username: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string' },
                        isActive: { type: 'boolean' },
                        isVerified: { type: 'boolean' },
                        createdAt: { type: 'string' },
                    },
                },
                accessToken: { type: 'string' },
            },
        },
    })
    @ApiResponse({
        status: 409,
        description: 'User already exists',
    })
    @ApiResponse({
        status: 400,
        description: 'Validation error',
    })
    async register(@Body() createUserDto: CreateUserDto): Promise<any> {
        return this.authService.register(createUserDto);
    }

    @Post('login')
    @Public()
    @HttpCode(HttpStatus.OK)
    @UseGuards(LocalAuthGuard)
    @ApiOperation({ summary: 'Login user' })
    @ApiResponse({
        status: 200,
        description: 'User logged in successfully',
        schema: {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        username: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string' },
                        isActive: { type: 'boolean' },
                        isVerified: { type: 'boolean' },
                    },
                },
                accessToken: { type: 'string' },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid credentials',
    })
    async login(@Body() loginDto: LoginDto): Promise<any> {
        // The user is already validated by the LocalAuthGuard
        return this.authService.login(loginDto);
    }

    @Post('forgot-password')
    @Public()
    @ApiOperation({ summary: 'Request password reset' })
    @ApiResponse({
        status: 200,
        description: 'Password reset email sent (if user exists)',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                expiresIn: { type: 'string' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Validation error',
    })
    async requestPasswordReset(@Body() requestResetDto: RequestPasswordResetDto): Promise<any> {
        return this.authService.requestPasswordReset(requestResetDto.email);
    }

    @Post('reset-password')
    @Public()
    @ApiOperation({ summary: 'Reset password with token' })
    @ApiResponse({
        status: 200,
        description: 'Password reset successful',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid or expired token',
    })
    @ApiResponse({
        status: 400,
        description: 'Validation error',
    })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<any> {
        return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
    }

    @Post('validate-reset-token')
    @Public()
    @ApiOperation({ summary: 'Validate password reset token' })
    @ApiResponse({
        status: 200,
        description: 'Token validation result',
        schema: {
            type: 'object',
            properties: {
                isValid: { type: 'boolean' },
                message: { type: 'string' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Validation error',
    })
    async validateResetToken(@Body() body: { token: string }): Promise<any> {
        return this.authService.validateResetToken(body.token);
    }
}
