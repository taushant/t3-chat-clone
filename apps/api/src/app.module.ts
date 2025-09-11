import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AppController } from "./app.controller";
import { HealthController } from "./health/health.controller";
import { ConfigService } from "./config/config.service";
// Adding database module back
import { DatabaseModule } from "./database/database.module";
// Adding auth module back
import { AuthModule } from "./auth/auth.module";
// Adding users module back
import { UsersModule } from "./users/users.module";
// Adding chats and messages modules back
import { ChatsModule } from "./chats/chats.module";
import { MessagesModule } from "./messages/messages.module";
// Adding websocket module back
import { WebsocketModule } from "./websocket/websocket.module";
// LLM module - re-enabled after fixing DTO issues
import { LLMModule } from "./llm/llm.module";
import { ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [
    // Configuration module - essential for ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      cache: true,
    }),

    // Event emitter module - global for LLM services
    EventEmitterModule.forRoot(),

    // Health checks module - essential for health endpoints
    TerminusModule,

    // Adding database module back
    DatabaseModule,

    // Adding auth module back
    AuthModule,

    // Adding users module back
    UsersModule,

    // Adding chats and messages modules back
    ChatsModule,
    MessagesModule,

    // Adding websocket module back
    WebsocketModule,

    // LLM module - re-enabled after fixing DTO issues
    LLMModule,

    // Rate limiting module - adding back
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        ttl: 300000, // 5 minutes
        limit: 5, // 5 attempts per 5 minutes for auth endpoints
      },
    ]),
  ],
  controllers: [AppController, HealthController],
  providers: [ConfigService],
})
export class AppModule {}
