import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AccountLockoutService {
    private readonly logger = new Logger(AccountLockoutService.name);
    private readonly MAX_FAILED_ATTEMPTS = 5;
    private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

    constructor(private prisma: PrismaService) { }

    async recordFailedAttempt(email: string): Promise<{ isLocked: boolean; remainingAttempts: number }> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true, isActive: true },
        });

        if (!user) {
            return { isLocked: false, remainingAttempts: 0 };
        }

        // Get or create failed attempts record
        let failedAttempts = await this.prisma.failedLoginAttempt.findUnique({
            where: { userId: user.id },
        });

        if (!failedAttempts) {
            failedAttempts = await this.prisma.failedLoginAttempt.create({
                data: {
                    userId: user.id,
                    attempts: 1,
                    lastAttempt: new Date(),
                },
            });
        } else {
            // Check if lockout period has expired
            const lockoutExpiry = new Date(failedAttempts.lastAttempt.getTime() + this.LOCKOUT_DURATION);
            if (new Date() > lockoutExpiry) {
                // Reset attempts if lockout period has expired
                failedAttempts = await this.prisma.failedLoginAttempt.update({
                    where: { id: failedAttempts.id },
                    data: {
                        attempts: 1,
                        lastAttempt: new Date(),
                    },
                });
            } else {
                // Increment attempts
                failedAttempts = await this.prisma.failedLoginAttempt.update({
                    where: { id: failedAttempts.id },
                    data: {
                        attempts: failedAttempts.attempts + 1,
                        lastAttempt: new Date(),
                    },
                });
            }
        }

        const remainingAttempts = Math.max(0, this.MAX_FAILED_ATTEMPTS - failedAttempts.attempts);
        const isLocked = failedAttempts.attempts >= this.MAX_FAILED_ATTEMPTS;

        if (isLocked) {
            this.logger.warn(`Account locked for user ${email} after ${failedAttempts.attempts} failed attempts`);
        }

        return { isLocked, remainingAttempts };
    }

    async resetFailedAttempts(userId: string): Promise<void> {
        await this.prisma.failedLoginAttempt.deleteMany({
            where: { userId },
        });
    }

    async isAccountLocked(userId: string): Promise<boolean> {
        const failedAttempts = await this.prisma.failedLoginAttempt.findUnique({
            where: { userId },
        });

        if (!failedAttempts) {
            return false;
        }

        if (failedAttempts.attempts < this.MAX_FAILED_ATTEMPTS) {
            return false;
        }

        // Check if lockout period has expired
        const lockoutExpiry = new Date(failedAttempts.lastAttempt.getTime() + this.LOCKOUT_DURATION);
        return new Date() <= lockoutExpiry;
    }
}
