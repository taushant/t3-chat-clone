import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { TerminusModule } from "@nestjs/terminus";
import { AppController } from "./app.controller";
import { HealthController } from "./health/health.controller";
import { ConfigService } from "./config/config.service";

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      cache: true,
    }),

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
export class AppModule {}
