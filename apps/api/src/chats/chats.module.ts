import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { PrismaService } from '../database/prisma.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [UsersModule, AuthModule],
    controllers: [ChatsController],
    providers: [ChatsService, PrismaService],
    exports: [ChatsService],
})
export class ChatsModule { }
