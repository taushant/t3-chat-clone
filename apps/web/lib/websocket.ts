import { io, Socket } from 'socket.io-client';
import { WebSocketMessage, TypingIndicator, PresenceStatus } from '@t3-chat/types';

export interface WebSocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  connect_error: (error: Error) => void;

  // Chat events
  'message:received': (message: any) => void;
  'message:typing': (data: TypingIndicator) => void;
  'message:delivered': (data: { messageId: string; chatId: string }) => void;
  'message:read': (data: { messageId: string; chatId: string; userId: string }) => void;

  // Room events
  'room:joined': (data: { chatId: string; participants: any[] }) => void;
  'room:left': (data: { chatId: string }) => void;
  'room:participants': (data: { chatId: string; participants: any[] }) => void;

  // Presence events
  'presence:online': (data: { userId: string; status: string }) => void;
  'presence:offline': (data: { userId: string }) => void;
  'presence:status': (data: PresenceStatus) => void;

  // LLM streaming events
  'llm:stream-start': (data: { sessionId: string; model: string }) => void;
  'llm:stream-chunk': (data: { sessionId: string; chunk: string; isComplete: boolean }) => void;
  'llm:stream-end': (data: { sessionId: string; usage?: any }) => void;
  'llm:stream-error': (data: { sessionId: string; error: string }) => void;
}

class WebSocketManager {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSocket();
    }
  }

  private initializeSocket() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('No access token found for WebSocket connection');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    
    this.socket = io(`${socketUrl}/chat`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnect');
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('connect_error', error);
      this.handleReconnect();
    });

    // Chat events
    this.socket.on('message:received', (data) => {
      this.emit('message:received', data);
    });

    this.socket.on('message:typing', (data) => {
      this.emit('message:typing', data);
    });

    this.socket.on('message:delivered', (data) => {
      this.emit('message:delivered', data);
    });

    this.socket.on('message:read', (data) => {
      this.emit('message:read', data);
    });

    // Room events
    this.socket.on('room:joined', (data) => {
      this.emit('room:joined', data);
    });

    this.socket.on('room:left', (data) => {
      this.emit('room:left', data);
    });

    this.socket.on('room:participants', (data) => {
      this.emit('room:participants', data);
    });

    // Presence events
    this.socket.on('presence:online', (data) => {
      this.emit('presence:online', data);
    });

    this.socket.on('presence:offline', (data) => {
      this.emit('presence:offline', data);
    });

    this.socket.on('presence:status', (data) => {
      this.emit('presence:status', data);
    });

    // LLM streaming events
    this.socket.on('llm:stream-start', (data) => {
      this.emit('llm:stream-start', data);
    });

    this.socket.on('llm:stream-chunk', (data) => {
      this.emit('llm:stream-chunk', data);
    });

    this.socket.on('llm:stream-end', (data) => {
      this.emit('llm:stream-end', data);
    });

    this.socket.on('llm:stream-error', (data) => {
      this.emit('llm:stream-error', data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.initializeSocket();
      }
    }, delay);
  }

  // Public methods
  connect() {
    if (!this.socket || !this.isConnected) {
      this.initializeSocket();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Event handling
  on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof WebSocketEvents>(event: K, ...args: Parameters<WebSocketEvents[K]>) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }

  // Chat methods
  joinChat(chatId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join:chat', { chatId });
    }
  }

  leaveChat(chatId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave:chat', { chatId });
    }
  }

  sendMessage(chatId: string, content: string, type: string = 'TEXT') {
    if (this.socket && this.isConnected) {
      this.socket.emit('message:send', { chatId, content, type });
    }
  }

  sendTyping(chatId: string, isTyping: boolean) {
    if (this.socket && this.isConnected) {
      this.socket.emit('message:typing', { chatId, isTyping });
    }
  }

  markMessageAsRead(messageId: string, chatId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('message:read', { messageId, chatId });
    }
  }

  // LLM streaming methods
  startLLMStream(messages: any[], model: string, options: any = {}) {
    if (this.socket && this.isConnected) {
      this.socket.emit('llm:stream-completion', {
        messages,
        model,
        ...options,
      });
    }
  }

  // Utility methods
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Create and export a singleton instance
export const wsManager = new WebSocketManager();
export default wsManager;
