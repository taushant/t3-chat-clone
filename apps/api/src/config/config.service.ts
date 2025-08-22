import { Injectable } from "@nestjs/common";
import { ConfigService as NestConfigService } from "@nestjs/config";

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>("NODE_ENV", "development");
  }

  get port(): number {
    return this.configService.get<number>("PORT", 3001);
  }

  get databaseUrl(): string {
    return this.configService.get<string>("DATABASE_URL")!;
  }

  get redisUrl(): string {
    return this.configService.get<string>(
      "REDIS_URL",
      "redis://localhost:6379",
    );
  }

  get jwtSecret(): string {
    return this.configService.get<string>("JWT_SECRET")!;
  }

  get jwtRefreshSecret(): string {
    return this.configService.get<string>("JWT_REFRESH_SECRET")!;
  }

  get jwtAccessExpiration(): string {
    return this.configService.get<string>("JWT_ACCESS_EXPIRATION", "15m");
  }

  get jwtRefreshExpiration(): string {
    return this.configService.get<string>("JWT_REFRESH_EXPIRATION", "7d");
  }

  get googleClientId(): string {
    return this.configService.get<string>("GOOGLE_CLIENT_ID", "");
  }

  get googleClientSecret(): string {
    return this.configService.get<string>("GOOGLE_CLIENT_SECRET", "");
  }

  get githubClientId(): string {
    return this.configService.get<string>("GITHUB_CLIENT_ID", "");
  }

  get githubClientSecret(): string {
    return this.configService.get<string>("GITHUB_CLIENT_SECRET", "");
  }

  get openaiApiKey(): string {
    return this.configService.get<string>("OPENAI_API_KEY", "");
  }

  get anthropicApiKey(): string {
    return this.configService.get<string>("ANTHROPIC_API_KEY", "");
  }

  get openrouterApiKey(): string {
    return this.configService.get<string>("OPENROUTER_API_KEY", "");
  }

  get awsAccessKeyId(): string {
    return this.configService.get<string>("AWS_ACCESS_KEY_ID", "");
  }

  get awsSecretAccessKey(): string {
    return this.configService.get<string>("AWS_SECRET_ACCESS_KEY", "");
  }

  get awsRegion(): string {
    return this.configService.get<string>("AWS_REGION", "us-east-1");
  }

  get s3BucketName(): string {
    return this.configService.get<string>("S3_BUCKET_NAME", "");
  }

  get frontendUrl(): string {
    return this.configService.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
  }

  get allowedOrigins(): string[] {
    const origins = this.configService.get<string>("ALLOWED_ORIGINS");
    return origins ? origins.split(",") : [this.frontendUrl];
  }

  get isProduction(): boolean {
    return this.nodeEnv === "production";
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === "development";
  }

  get isTest(): boolean {
    return this.nodeEnv === "test";
  }
}
