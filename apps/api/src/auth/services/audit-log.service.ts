import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export enum AuditEventType {
    USER_LOGIN = 'USER_LOGIN',
    USER_LOGOUT = 'USER_LOGOUT',
    USER_REGISTER = 'USER_REGISTER',
    LOGIN_FAILED = 'LOGIN_FAILED',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    PASSWORD_CHANGED = 'PASSWORD_CHANGED',
    PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
    PROFILE_UPDATED = 'PROFILE_UPDATED',
    ROLE_CHANGED = 'ROLE_CHANGED',
    ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
    API_KEY_CREATED = 'API_KEY_CREATED',
    API_KEY_REVOKED = 'API_KEY_REVOKED',
}

export interface AuditLogData {
    userId?: string;
    eventType: AuditEventType;
    description: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditLogService {
    private readonly logger = new Logger(AuditLogService.name);

    constructor(private prisma: PrismaService) { }

    async log(data: AuditLogData): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: data.userId,
                    eventType: data.eventType,
                    description: data.description,
                    metadata: data.metadata || {},
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                },
            });

            // Also log to console for development
            this.logger.log(`AUDIT: ${data.eventType} - ${data.description}${data.userId ? ` (User: ${data.userId})` : ''}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to create audit log: ${errorMessage}`, errorStack);
        }
    }

    async logSecurityEvent(eventType: AuditEventType, description: string, userId?: string, metadata?: Record<string, any>): Promise<void> {
        await this.log({
            userId,
            eventType,
            description,
            metadata,
        });
    }

    async logUserAction(eventType: AuditEventType, description: string, userId: string, metadata?: Record<string, any>): Promise<void> {
        await this.log({
            userId,
            eventType,
            description,
            metadata,
        });
    }

    async getAuditLogs(userId?: string, eventType?: AuditEventType, limit = 100, offset = 0) {
        const where: any = {};

        if (userId) {
            where.userId = userId;
        }

        if (eventType) {
            where.eventType = eventType;
        }

        return this.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                    },
                },
            },
        });
    }
}
