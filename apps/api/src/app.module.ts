import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { TerminusModule } from "@nestjs/terminus";
import { AppController } from "./app.controller";
import { HealthController } from "./health/health.controller";
import { ConfigService } from "./config/config.service";
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      cache: true,
    }),

    // Database module
    DatabaseModule,

    // Authentication module
    AuthModule,

    // Users module
    UsersModule,

    // Rate limiting module
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

    // Health checks module
    TerminusModule,
  ],
  controllers: [AppController, HealthController],
  providers: [ConfigService],
})
export class AppModule { }
