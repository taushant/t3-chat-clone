import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaService } from '../database/prisma.service';
import { ChatsModule } from '../chats/chats.module';

@Module({
    imports: [ChatsModule],
    controllers: [MessagesController],
    providers: [MessagesService, PrismaService],
    exports: [MessagesService],
})
export class MessagesModule { }
