import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService, AuditEventType } from './audit-log.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class PasswordResetService {
    private readonly logger = new Logger(PasswordResetService.name);
    private readonly TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

    constructor(
        private prisma: PrismaService,
        private auditLogService: AuditLogService,
    ) { }

    async generateResetToken(email: string): Promise<{ token: string; expiresAt: Date }> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, isActive: true },
        });

        if (!user || !user.isActive) {
            // Don't reveal if user exists or not for security
            this.logger.warn(`Password reset requested for non-existent or inactive user: ${email}`);
            return { token: 'dummy-token', expiresAt: new Date() };
        }

        // Generate secure random token
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY);

        // Check if user already has a reset token
        const existingToken = await this.prisma.passwordResetToken.findFirst({
            where: { userId: user.id },
        });

        if (existingToken) {
            // Update existing token
            await this.prisma.passwordResetToken.update({
                where: { id: existingToken.id },
                data: {
                    token,
                    expiresAt,
                    isUsed: false,
                },
            });
        } else {
            // Create new token
            await this.prisma.passwordResetToken.create({
                data: {
                    userId: user.id,
                    token,
                    expiresAt,
                    isUsed: false,
                },
            });
        }

        // Log password reset request
        await this.auditLogService.logSecurityEvent(
            AuditEventType.PASSWORD_RESET_REQUESTED,
            `Password reset requested for user: ${email}`,
            user.id,
            { email, tokenExpiry: expiresAt }
        );

        this.logger.log(`Password reset token generated for user: ${email}`);

        return { token, expiresAt };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        // Find the reset token
        const resetToken = await this.prisma.passwordResetToken.findFirst({
            where: {
                token,
                isUsed: false,
                expiresAt: { gt: new Date() },
            },
            include: {
                user: {
                    select: { id: true, email: true, isActive: true },
                },
            },
        });

        if (!resetToken) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        if (!resetToken.user.isActive) {
            throw new BadRequestException('User account is inactive');
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user password
        await this.prisma.user.update({
            where: { id: resetToken.user.id },
            data: { password: hashedPassword },
        });

        // Mark token as used
        await this.prisma.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { isUsed: true },
        });

        // Log password change
        await this.auditLogService.logSecurityEvent(
            AuditEventType.PASSWORD_CHANGED,
            `Password changed via reset token for user: ${resetToken.user.email}`,
            resetToken.user.id,
            { email: resetToken.user.email, method: 'reset_token' }
        );

        this.logger.log(`Password reset successful for user: ${resetToken.user.email}`);

        return {
            success: true,
            message: 'Password reset successful',
        };
    }

    async validateResetToken(token: string): Promise<{ isValid: boolean; userId?: string }> {
        const resetToken = await this.prisma.passwordResetToken.findFirst({
            where: {
                token,
                isUsed: false,
                expiresAt: { gt: new Date() },
            },
            select: { userId: true },
        });

        return {
            isValid: !!resetToken,
            userId: resetToken?.userId,
        };
    }

    async cleanupExpiredTokens(): Promise<void> {
        const deletedCount = await this.prisma.passwordResetToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { isUsed: true },
                ],
            },
        });

        if (deletedCount.count > 0) {
            this.logger.log(`Cleaned up ${deletedCount.count} expired password reset tokens`);
        }
    }
}
