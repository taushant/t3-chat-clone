import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
            errorFormat: 'pretty',
        });
    }

    async onModuleInit() {
        try {
            this.logger.log('🔌 Connecting to database...');
            this.logger.log(`📊 Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
            await this.$connect();
            this.logger.log('✅ Database connected successfully');
        } catch (error) {
            this.logger.error('❌ Failed to connect to database:', error);
            throw error;
        }
    }

    async onModuleDestroy() {
        try {
            this.logger.log('🔌 Disconnecting from database...');
            await this.$disconnect();
            this.logger.log('✅ Database disconnected successfully');
        } catch (error) {
            this.logger.error('❌ Error disconnecting from database:', error);
        }
    }

    async cleanDatabase() {
        if (process.env.NODE_ENV === 'test') {
            const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname='public'
      `;

            const tables = tablenames
                .map(({ tablename }) => tablename)
                .filter((name) => name !== '_prisma_migrations')
                .map((name) => `"public"."${name}"`)
                .join(', ');

            try {
                await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
            } catch (error) {
                console.log({ error });
            }
        }
    }
}
