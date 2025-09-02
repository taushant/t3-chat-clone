import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthenticatedSocket } from '../websocket.gateway';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: AuthenticatedSocket = context.switchToWs().getClient();
      const token = this.extractTokenFromHeader(client);
      
      if (!token) {
        this.logger.warn(`WebSocket connection attempt without token from IP: ${client.handshake.address}`);
        throw new WsException('Access token not provided');
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Validate user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          isVerified: true,
        },
      });

      if (!user) {
        this.logger.warn(`WebSocket connection attempt with invalid user ID: ${payload.sub}`);
        throw new WsException('User not found');
      }

      if (!user.isActive) {
        this.logger.warn(`WebSocket connection attempt from inactive user: ${user.id}`);
        throw new WsException('User account is inactive');
      }

      if (!user.isVerified) {
        this.logger.warn(`WebSocket connection attempt from unverified user: ${user.id}`);
        throw new WsException('User account is not verified');
      }

      // Attach user info to the socket
      client.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      };

      this.logger.log(`WebSocket authentication successful for user: ${user.username} (${user.id})`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`WebSocket authentication failed: ${errorMessage}`);
      throw new WsException('Invalid access token');
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    const auth = client.handshake.auth.token || client.handshake.headers.authorization;
    
    if (!auth) {
      return undefined;
    }

    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth.substring(7);
    }

    return auth;
  }
}

