import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';
import { WebSocketRateLimitService } from './services/websocket-rate-limit.service';
import { RoomManagementService } from './services/room-management.service';
import { MessagingService } from './services/messaging.service';
import { PresenceService } from './services/presence.service';
import { ConnectionRecoveryService } from './services/connection-recovery.service';
import { ConnectionMonitoringService } from './services/connection-monitoring.service';
import { ChatsModule } from '../chats/chats.module';
import { MessagesModule } from '../messages/messages.module';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ChatsModule,
    MessagesModule,
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [WebsocketGateway, WsJwtAuthGuard, WebSocketRateLimitService, RoomManagementService, MessagingService, PresenceService, ConnectionRecoveryService, ConnectionMonitoringService],
  exports: [WebsocketGateway, WebSocketRateLimitService, RoomManagementService, MessagingService, PresenceService, ConnectionRecoveryService, ConnectionMonitoringService],
})
export class WebsocketModule {}

