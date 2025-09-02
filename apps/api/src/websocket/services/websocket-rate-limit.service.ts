import { Injectable, Logger } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  lastAttempt: Date;
  blockedUntil?: Date;
}

@Injectable()
export class WebSocketRateLimitService {
  private readonly logger = new Logger(WebSocketRateLimitService.name);
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();
  
  // Rate limiting configuration
  private readonly CONNECTION_ATTEMPTS_LIMIT = 5;
  private readonly CONNECTION_ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes
  private readonly MESSAGE_RATE_LIMIT = 100; // messages per minute
  private readonly MESSAGE_RATE_WINDOW = 60 * 1000; // 1 minute
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Check if a connection attempt is allowed
   */
  isConnectionAllowed(clientIP: string): boolean {
    const now = new Date();
    const entry = this.rateLimitMap.get(clientIP);
    
    // Check if currently blocked
    if (entry?.blockedUntil && now < entry.blockedUntil) {
      this.logger.warn(`Connection blocked for IP: ${clientIP} until ${entry.blockedUntil}`);
      return false;
    }
    
    // If no entry exists, create one
    if (!entry) {
      this.rateLimitMap.set(clientIP, {
        count: 1,
        lastAttempt: now,
      });
      return true;
    }
    
    // Reset if outside the time window
    if (now.getTime() - entry.lastAttempt.getTime() > this.CONNECTION_ATTEMPT_WINDOW) {
      this.rateLimitMap.set(clientIP, {
        count: 1,
        lastAttempt: now,
      });
      return true;
    }
    
    // Check if within rate limit
    if (entry.count >= this.CONNECTION_ATTEMPTS_LIMIT) {
      // Block the IP
      entry.blockedUntil = new Date(now.getTime() + this.BLOCK_DURATION);
      this.rateLimitMap.set(clientIP, entry);
      this.logger.warn(`IP ${clientIP} blocked for ${this.BLOCK_DURATION / 1000 / 60} minutes due to excessive connection attempts`);
      return false;
    }
    
    // Increment counter
    entry.count++;
    entry.lastAttempt = now;
    this.rateLimitMap.set(clientIP, entry);
    
    return true;
  }

  /**
   * Check if a message is allowed to be sent
   */
  isMessageAllowed(userId: string): boolean {
    const now = new Date();
    const key = `msg:${userId}`;
    const entry = this.rateLimitMap.get(key);
    
    // If no entry exists, create one
    if (!entry) {
      this.rateLimitMap.set(key, {
        count: 1,
        lastAttempt: now,
      });
      return true;
    }
    
    // Reset if outside the time window
    if (now.getTime() - entry.lastAttempt.getTime() > this.MESSAGE_RATE_WINDOW) {
      this.rateLimitMap.set(key, {
        count: 1,
        lastAttempt: now,
      });
      return true;
    }
    
    // Check if within rate limit
    if (entry.count >= this.MESSAGE_RATE_LIMIT) {
      this.logger.warn(`Message rate limit exceeded for user: ${userId}`);
      return false;
    }
    
    // Increment counter
    entry.count++;
    entry.lastAttempt = now;
    this.rateLimitMap.set(key, entry);
    
    return true;
  }

  /**
   * Record a successful connection
   */
  recordSuccessfulConnection(clientIP: string): void {
    // Reset connection attempts on successful connection
    this.rateLimitMap.delete(clientIP);
    this.logger.log(`Connection successful for IP: ${clientIP}, rate limit reset`);
  }

  /**
   * Get rate limit status for an IP
   */
  getRateLimitStatus(clientIP: string): {
    allowed: boolean;
    attemptsRemaining: number;
    blockedUntil?: Date;
  } {
    const entry = this.rateLimitMap.get(clientIP);
    const now = new Date();
    
    if (!entry) {
      return {
        allowed: true,
        attemptsRemaining: this.CONNECTION_ATTEMPTS_LIMIT,
      };
    }
    
    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        attemptsRemaining: 0,
        blockedUntil: entry.blockedUntil,
      };
    }
    
    // Reset if outside the time window
    if (now.getTime() - entry.lastAttempt.getTime() > this.CONNECTION_ATTEMPT_WINDOW) {
      return {
        allowed: true,
        attemptsRemaining: this.CONNECTION_ATTEMPTS_LIMIT,
      };
    }
    
    return {
      allowed: entry.count < this.CONNECTION_ATTEMPTS_LIMIT,
      attemptsRemaining: Math.max(0, this.CONNECTION_ATTEMPTS_LIMIT - entry.count),
    };
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.rateLimitMap.entries()) {
      const isConnectionEntry = !key.startsWith('msg:');
      const window = isConnectionEntry ? this.CONNECTION_ATTEMPT_WINDOW : this.MESSAGE_RATE_WINDOW;
      
      // Remove entries that are outside their time window and not blocked
      if (now.getTime() - entry.lastAttempt.getTime() > window && !entry.blockedUntil) {
        this.rateLimitMap.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} old rate limit entries`);
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEntries: number;
    blockedIPs: number;
    connectionAttempts: number;
    messageRateLimits: number;
  } {
    const now = new Date();
    let blockedIPs = 0;
    let connectionAttempts = 0;
    let messageRateLimits = 0;
    
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (entry.blockedUntil && now < entry.blockedUntil) {
        blockedIPs++;
      }
      
      if (key.startsWith('msg:')) {
        messageRateLimits++;
      } else {
        connectionAttempts++;
      }
    }
    
    return {
      totalEntries: this.rateLimitMap.size,
      blockedIPs,
      connectionAttempts,
      messageRateLimits,
    };
  }
}
