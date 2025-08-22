import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { AuditLogService, AuditEventType } from './services/audit-log.service';
import { PasswordResetService } from './services/password-reset.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private accountLockoutService: AccountLockoutService,
        private auditLogService: AuditLogService,
        private passwordResetService: PasswordResetService,
    ) { }

    async register(createUserDto: CreateUserDto) {
        const { email, username, password, firstName, lastName } = createUserDto;

        // Check if user already exists
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username },
                ],
            },
        });

        if (existingUser) {
            if (existingUser.email === email) {
                throw new ConflictException('Email already exists');
            }
            if (existingUser.username === username) {
                throw new ConflictException('Username already exists');
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                firstName,
                lastName,
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
            },
        });

        // Log user registration
        await this.auditLogService.logUserAction(
            AuditEventType.USER_REGISTER,
            `User registered: ${email}`,
            user.id,
            { email, username }
        );

        // Generate JWT token
        const payload = { sub: user.id, email: user.email, username: user.username };
        const accessToken = this.jwtService.sign(payload);

        return {
            user,
            accessToken,
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        // Check if account is locked
        const lockoutStatus = await this.accountLockoutService.recordFailedAttempt(email);
        if (lockoutStatus.isLocked) {
            await this.auditLogService.logSecurityEvent(
                AuditEventType.ACCOUNT_LOCKED,
                `Account locked due to multiple failed attempts: ${email}`,
                undefined,
                { email, attempts: lockoutStatus.remainingAttempts }
            );
            throw new UnauthorizedException(
                `Account temporarily locked due to multiple failed attempts. Please try again later.`,
            );
        }

        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.isActive) {
            await this.auditLogService.logSecurityEvent(
                AuditEventType.LOGIN_FAILED,
                `Failed login attempt for inactive/non-existent user: ${email}`,
                user?.id,
                { email, reason: user ? 'inactive' : 'not_found' }
            );
            throw new UnauthorizedException('Invalid credentials or inactive user');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            // Password is invalid, but we already recorded the failed attempt above
            await this.auditLogService.logSecurityEvent(
                AuditEventType.LOGIN_FAILED,
                `Failed login attempt with invalid password: ${email}`,
                user.id,
                { email, attempts: lockoutStatus.remainingAttempts }
            );
            throw new UnauthorizedException(
                `Invalid credentials. ${lockoutStatus.remainingAttempts} attempts remaining before account lockout.`,
            );
        }

        // Password is valid, reset failed attempts
        await this.accountLockoutService.resetFailedAttempts(user.id);

        // Log successful login
        await this.auditLogService.logUserAction(
            AuditEventType.USER_LOGIN,
            `User logged in: ${email}`,
            user.id,
            { email, ipAddress: '127.0.0.1' } // TODO: Get real IP from request
        );

        // Generate JWT token
        const payload = { sub: user.id, email: user.email, username: user.username };
        const accessToken = this.jwtService.sign(payload);

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: user.isActive,
                isVerified: user.isVerified,
            },
            accessToken,
        };
    }

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (user && await bcrypt.compare(password, user.password)) {
            const { password: _, ...result } = user;
            return result;
        }

        return null;
    }

    async requestPasswordReset(email: string) {
        const { token, expiresAt } = await this.passwordResetService.generateResetToken(email);

        // TODO: Send email with reset token
        // For now, return the token (in production, this would be sent via email)

        return {
            message: 'If an account with this email exists, a password reset link has been sent.',
            expiresIn: '1 hour',
            // Note: In production, remove this token from response
            token: process.env.NODE_ENV === 'development' ? token : undefined,
        };
    }

    async resetPassword(token: string, newPassword: string) {
        return this.passwordResetService.resetPassword(token, newPassword);
    }

    async validateResetToken(token: string) {
        const { isValid } = await this.passwordResetService.validateResetToken(token);

        return {
            isValid,
            message: isValid ? 'Token is valid' : 'Token is invalid or expired',
        };
    }
}
