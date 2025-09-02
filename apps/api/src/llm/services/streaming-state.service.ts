import { Injectable, Logger } from '@nestjs/common';
import { 
  StreamingSession, 
  StreamingState, 
  StreamingStatus,
  StreamingEventType,
} from '../types/streaming.types';

/**
 * Streaming State Service
 * Manages streaming sessions and their state
 */
@Injectable()
export class StreamingStateService {
  private readonly logger = new Logger(StreamingStateService.name);
  private readonly streamingSessions = new Map<string, StreamingSession>();
  private readonly sessionStates = new Map<string, StreamingState>();

  /**
   * Create a new streaming session
   * @param userId - User ID
   * @param requestId - Request ID
   * @param provider - LLM provider
   * @param model - Model name
   * @param metadata - Additional metadata
   * @returns StreamingSession
   */
  createSession(
    userId: string,
    requestId: string,
    provider: string,
    model: string,
    metadata: Record<string, any> = {}
  ): StreamingSession {
    const sessionId = this.generateSessionId(userId, requestId);
    
    const session: StreamingSession = {
      id: sessionId,
      userId,
      requestId,
      provider,
      model,
      status: StreamingStatus.CONNECTING,
      startTime: new Date(),
      totalChunks: 0,
      totalTokens: 0,
      metadata: {
        ...metadata,
        userAgent: metadata.userAgent || 'unknown',
        ipAddress: metadata.ipAddress || 'unknown',
      },
    };

    this.streamingSessions.set(sessionId, session);
    this.initializeSessionState(sessionId);

    this.logger.log(`Created streaming session ${sessionId} for user ${userId}`);
    this.emitEvent(StreamingEventType.SESSION_STARTED, sessionId, session);

    return session;
  }

  /**
   * Get a streaming session by ID
   * @param sessionId - Session ID
   * @returns StreamingSession or null
   */
  getSession(sessionId: string): StreamingSession | null {
    return this.streamingSessions.get(sessionId) || null;
  }

  /**
   * Update session state
   * @param sessionId - Session ID
   * @param state - New state
   */
  updateSession(sessionId: string, state: Partial<StreamingState>): void {
    const currentState = this.sessionStates.get(sessionId);
    if (currentState) {
      Object.assign(currentState, state, { lastUpdate: new Date() });
      this.sessionStates.set(sessionId, currentState);
    }
  }

  /**
   * Update session status
   * @param sessionId - Session ID
   * @param status - New status
   */
  updateSessionStatus(sessionId: string, status: StreamingStatus): void {
    const session = this.streamingSessions.get(sessionId);
    if (session) {
      session.status = status;
      
      if (status === StreamingStatus.COMPLETED || status === StreamingStatus.ERROR) {
        session.endTime = new Date();
      }

      this.logger.debug(`Updated session ${sessionId} status to ${status}`);
    }

    this.updateSession(sessionId, { status });
  }

  /**
   * Add chunk to session
   * @param sessionId - Session ID
   * @param chunkSize - Size of the chunk
   * @param tokenCount - Number of tokens in the chunk
   */
  addChunkToSession(sessionId: string, chunkSize: number, tokenCount: number): void {
    const session = this.streamingSessions.get(sessionId);
    if (session) {
      session.totalChunks++;
      session.totalTokens += tokenCount;

      // Update state
      const state = this.sessionStates.get(sessionId);
      if (state) {
        state.currentChunk = session.totalChunks;
        state.progress = this.calculateProgress(session);
        this.sessionStates.set(sessionId, state);
      }

      this.logger.debug(
        `Added chunk to session ${sessionId}, total chunks: ${session.totalChunks}, total tokens: ${session.totalTokens}`
      );
    }
  }

  /**
   * Complete a streaming session
   * @param sessionId - Session ID
   * @param success - Whether the session completed successfully
   */
  completeSession(sessionId: string, success: boolean = true): void {
    const session = this.streamingSessions.get(sessionId);
    if (session) {
      session.status = success ? StreamingStatus.COMPLETED : StreamingStatus.ERROR;
      session.endTime = new Date();

      this.updateSession(sessionId, { 
        status: session.status,
        progress: 100,
      });

      this.logger.log(
        `Completed session ${sessionId} for user ${session.userId}, ` +
        `chunks: ${session.totalChunks}, tokens: ${session.totalTokens}, success: ${success}`
      );

      this.emitEvent(StreamingEventType.SESSION_COMPLETED, sessionId, session);
    }
  }

  /**
   * Get session state
   * @param sessionId - Session ID
   * @returns StreamingState or null
   */
  getSessionState(sessionId: string): StreamingState | null {
    return this.sessionStates.get(sessionId) || null;
  }

  /**
   * Get all sessions for a user
   * @param userId - User ID
   * @returns Array of sessions
   */
  getUserSessions(userId: string): StreamingSession[] {
    return Array.from(this.streamingSessions.values())
      .filter(session => session.userId === userId);
  }

  /**
   * Get active sessions for a user
   * @param userId - User ID
   * @returns Array of active sessions
   */
  getActiveUserSessions(userId: string): StreamingSession[] {
    return Array.from(this.streamingSessions.values())
      .filter(session => 
        session.userId === userId && 
        (session.status === StreamingStatus.ACTIVE || session.status === StreamingStatus.CONNECTING)
      );
  }

  /**
   * Clean up completed sessions
   * @param maxAge - Maximum age in milliseconds
   */
  cleanupCompletedSessions(maxAge: number = 3600000): void { // 1 hour default
    const now = new Date();
    const sessionsToRemove: string[] = [];

    for (const [sessionId, session] of this.streamingSessions) {
      if (session.endTime) {
        const age = now.getTime() - session.endTime.getTime();
        if (age > maxAge) {
          sessionsToRemove.push(sessionId);
        }
      }
    }

    for (const sessionId of sessionsToRemove) {
      this.cleanupSession(sessionId);
    }

    if (sessionsToRemove.length > 0) {
      this.logger.log(`Cleaned up ${sessionsToRemove.length} completed sessions`);
    }
  }

  /**
   * Clean up a specific session
   * @param sessionId - Session ID
   */
  cleanupSession(sessionId: string): void {
    const session = this.streamingSessions.get(sessionId);
    if (session) {
      this.streamingSessions.delete(sessionId);
      this.sessionStates.delete(sessionId);
      
      this.logger.debug(`Cleaned up session ${sessionId}`);
    }
  }

  /**
   * Get session statistics
   * @returns Session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    errorSessions: number;
    averageSessionDuration: number;
    totalTokens: number;
  } {
    const sessions = Array.from(this.streamingSessions.values());
    const now = new Date();

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => 
      s.status === StreamingStatus.ACTIVE || s.status === StreamingStatus.CONNECTING
    ).length;
    const completedSessions = sessions.filter(s => s.status === StreamingStatus.COMPLETED).length;
    const errorSessions = sessions.filter(s => s.status === StreamingStatus.ERROR).length;

    const averageSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, session) => {
          const endTime = session.endTime || now;
          return sum + (endTime.getTime() - session.startTime.getTime());
        }, 0) / sessions.length
      : 0;

    const totalTokens = sessions.reduce((sum, session) => sum + session.totalTokens, 0);

    return {
      totalSessions,
      activeSessions,
      completedSessions,
      errorSessions,
      averageSessionDuration,
      totalTokens,
    };
  }

  /**
   * Initialize session state
   * @param sessionId - Session ID
   */
  private initializeSessionState(sessionId: string): void {
    const state: StreamingState = {
      sessionId,
      status: StreamingStatus.CONNECTING,
      currentChunk: 0,
      totalChunks: 0,
      progress: 0,
      lastUpdate: new Date(),
    };

    this.sessionStates.set(sessionId, state);
  }

  /**
   * Calculate progress percentage
   * @param session - Streaming session
   * @returns Progress percentage (0-100)
   */
  private calculateProgress(session: StreamingSession): number {
    // This is a simplified calculation
    // In a real implementation, you might have more sophisticated progress tracking
    if (session.status === StreamingStatus.COMPLETED) {
      return 100;
    }
    
    // Estimate progress based on chunks received
    // This is a rough estimate and could be improved with better metrics
    return Math.min(95, (session.totalChunks / 10) * 100);
  }

  /**
   * Generate unique session ID
   * @param userId - User ID
   * @param requestId - Request ID
   * @returns Session ID
   */
  private generateSessionId(userId: string, requestId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `session_${userId}_${requestId}_${timestamp}_${random}`;
  }

  /**
   * Emit streaming event
   * @param type - Event type
   * @param sessionId - Session ID
   * @param data - Event data
   */
  private emitEvent(type: StreamingEventType, sessionId: string, data: any): void {
    // In a real implementation, you might emit this to an event bus
    this.logger.debug(`Streaming event: ${type} for session ${sessionId}`);
  }
}

