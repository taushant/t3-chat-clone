import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import compression from "compression";
import { AppModule } from "./app.module";

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    logger.log('🚀 Starting T3 Chat Clone API...');
    logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🔧 Port: ${process.env.PORT || 3001}`);
    logger.log(`🗄️ Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
    
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    logger.log('✅ NestJS application created successfully');

    // Security configurations
    logger.log('🔒 Setting up security middleware...');
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "https:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      }),
    );
    logger.log('✅ Security middleware configured');

    // Additional security headers
    logger.log('🛡️ Setting up additional security headers...');
    app.use((req: any, res: any, next: any) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
      next();
    });

    // CORS configuration
    logger.log('🌐 Configuring CORS...');
    const corsOptions = {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400, // 24 hours
    };
    app.enableCors(corsOptions);
    logger.log(`✅ CORS configured for origins: ${corsOptions.origin.join(', ')}`);

    // Compression middleware
    logger.log('🗜️ Setting up compression middleware...');
    app.use(compression());
    logger.log('✅ Compression middleware configured');

    // Global validation pipe with security considerations
    logger.log('✅ Setting up global validation pipe...');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Strip properties that don't have decorators
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
        transform: true, // Transform payloads to DTO instances
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Global prefix for API routes
    logger.log('🔗 Setting global API prefix...');
    app.setGlobalPrefix("api/v1");
    logger.log('✅ Global prefix set to "api/v1"');

    // Swagger documentation setup
    logger.log('📚 Setting up Swagger documentation...');
    const config = new DocumentBuilder()
      .setTitle("T3 Chat Clone API")
      .setDescription("The T3 Chat Clone API description")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
    logger.log('✅ Swagger documentation configured');

    const port = process.env.PORT || 3001;
    logger.log(`🚀 Starting server on port ${port}...`);
    
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(
      `📚 API Documentation available at: http://localhost:${port}/api/docs`,
    );
    logger.log('✅ Server started successfully!');
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    if (error instanceof Error) {
      logger.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

bootstrap().catch((error) => {
  console.error("❌ Error starting application:", error);
  process.exit(1);
});
