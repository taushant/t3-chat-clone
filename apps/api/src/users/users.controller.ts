import { Controller, Get, Put, Body, UseGuards, BadRequestException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserSearchDto } from './dto/user-search.dto';
import { AuditLogService, AuditEventType } from '../auth/services/audit-log.service';
import * as bcrypt from 'bcrypt';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(
        private prisma: PrismaService,
        private auditLogService: AuditLogService,
    ) { }

    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
        status: 200,
        description: 'User profile retrieved successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async getProfile(@CurrentUser() user: any) {
        const userProfile = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                isVerified: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return userProfile;
    }

    @Put('profile')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({
        status: 200,
        description: 'Profile updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async updateProfile(
        @CurrentUser() user: any,
        @Body() updateData: UpdateProfileDto,
    ) {
        const updatedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                avatar: updateData.avatar,
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
                avatar: true,
                updatedAt: true,
            },
        });

        // Log profile update
        await this.auditLogService.logUserAction(
            AuditEventType.PROFILE_UPDATED,
            `Profile updated for user: ${user.email}`,
            user.id,
            { updatedFields: Object.keys(updateData) }
        );

        return updatedUser;
    }

    @Put('change-password')
    @ApiOperation({ summary: 'Change current user password' })
    @ApiResponse({
        status: 200,
        description: 'Password changed successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid current password',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async changePassword(
        @CurrentUser() user: any,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        // Verify current password
        const currentUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { password: true },
        });

        if (!currentUser) {
            throw new BadRequestException('User not found');
        }

        const isCurrentPasswordValid = await bcrypt.compare(
            changePasswordDto.currentPassword,
            currentUser.password,
        );

        if (!isCurrentPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 12);

        // Update password
        await this.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedNewPassword },
        });

        // Log password change
        await this.auditLogService.logSecurityEvent(
            AuditEventType.PASSWORD_CHANGED,
            `Password changed for user: ${user.email}`,
            user.id,
            { method: 'manual_change' }
        );

        return {
            message: 'Password changed successfully',
        };
    }

    @Get('search')
    @Roles(UserRole.ADMIN, UserRole.MODERATOR)
    @ApiOperation({ summary: 'Search and filter users (Admin/Moderator only)' })
    @ApiResponse({
        status: 200,
        description: 'Users search results with pagination',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Admin/Moderator access required',
    })
    async searchUsers(@Query() searchDto: UserSearchDto) {
        const { page = 1, limit = 20, search, role, isActive, isVerified, sortBy = 'createdAt', sortOrder = 'desc' } = searchDto;

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (role) {
            where.role = role;
        }

        if (typeof isActive === 'boolean') {
            where.isActive = isActive;
        }

        if (typeof isVerified === 'boolean') {
            where.isVerified = isVerified;
        }

        // Get total count for pagination
        const totalUsers = await this.prisma.user.count({ where });

        // Get users with pagination
        const users = await this.prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                isVerified: true,
                avatar: true,
                createdAt: true,
            },
            orderBy: { [sortBy]: sortOrder },
            take: limit,
            skip,
        });

        return {
            users,
            pagination: {
                page,
                limit,
                total: totalUsers,
                totalPages: Math.ceil(totalUsers / limit),
                hasNext: page * limit < totalUsers,
                hasPrev: page > 1,
            },
        };
    }

    @Get('admin/users')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    @ApiResponse({
        status: 200,
        description: 'Users list retrieved successfully',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Admin access required',
    })
    async getAllUsers() {
        const users = await this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                isVerified: true,
                avatar: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return users;
    }

    @Get('moderator/active-users')
    @Roles(UserRole.ADMIN, UserRole.MODERATOR)
    @ApiOperation({ summary: 'Get active users (Admin/Moderator only)' })
    @ApiResponse({
        status: 200,
        description: 'Active users list retrieved successfully',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Admin/Moderator access required',
    })
    async getActiveUsers() {
        const activeUsers = await this.prisma.user.findMany({
            where: { isActive: true },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                isVerified: true,
                avatar: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return activeUsers;
    }

    @Get('public/stats')
    @Public()
    @ApiOperation({ summary: 'Get public user statistics' })
    @ApiResponse({
        status: 200,
        description: 'User statistics retrieved successfully',
    })
    async getPublicStats() {
        const totalUsers = await this.prisma.user.count();
        const activeUsers = await this.prisma.user.count({ where: { isActive: true } });
        const verifiedUsers = await this.prisma.user.count({ where: { isVerified: true } });

        return {
            totalUsers,
            activeUsers,
            verifiedUsers,
            timestamp: new Date().toISOString(),
        };
    }
}
