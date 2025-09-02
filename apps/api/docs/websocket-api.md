# WebSocket API Documentation

## Overview

The WebSocket API provides real-time communication capabilities for the T3 Chat Clone application. It supports chat messaging, presence management, room management, connection recovery, and monitoring features.

## Connection

### Base URL

```
ws://localhost:3001/chat
```

### Authentication

All WebSocket connections require JWT authentication. Include the token in the connection auth:

```javascript
const socket = io("ws://localhost:3001/chat", {
  auth: {
    token: "your-jwt-token",
  },
});
```

## Event Types

### Connection Events

#### `connect`

Emitted when client successfully connects to the WebSocket server.

#### `disconnect`

Emitted when client disconnects from the WebSocket server.

#### `connect_error`

Emitted when connection fails (e.g., invalid token, rate limiting).

---

## Room Management

### Join Chat Room

**Event:** `join:chat`
**Authentication:** Required

Join a specific chat room to receive messages and participate in conversations.

**Request:**

```javascript
socket.emit(
  "join:chat",
  {
    chatId: "chat-uuid",
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  message: 'Joined chat successfully',
  roomInfo: {
    chatId: 'chat-uuid',
    participantCount: 5,
    isActive: true,
    lastActivity: '2025-01-09T21:30:00.000Z'
  }
}
```

**Events Emitted:**

- `user:joined` - Broadcasted to all room participants
- `room:joined` - Sent to the joining user
- `room:online-update` - Broadcasted to all room participants

### Leave Chat Room

**Event:** `leave:chat`
**Authentication:** Required

Leave a specific chat room.

**Request:**

```javascript
socket.emit(
  "leave:chat",
  {
    chatId: "chat-uuid",
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  message: 'Left chat successfully'
}
```

**Events Emitted:**

- `user:left` - Broadcasted to all room participants
- `room:left` - Sent to the leaving user
- `room:online-update` - Broadcasted to all room participants

### Get Room Information

**Event:** `room:info`
**Authentication:** Required

Get detailed information about a specific chat room.

**Request:**

```javascript
socket.emit(
  "room:info",
  {
    chatId: "chat-uuid",
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  roomInfo: {
    chatId: 'chat-uuid',
    name: 'Chat Room Name',
    description: 'Chat description',
    participantCount: 5,
    onlineCount: 3,
    isActive: true,
    lastActivity: '2025-01-09T21:30:00.000Z'
  }
}
```

### Get User Rooms

**Event:** `room:list`
**Authentication:** Required

Get list of all rooms the user has access to.

**Request:**

```javascript
socket.emit("room:list", {}, (response) => {
  console.log(response);
});
```

**Response:**

```javascript
{
  success: true,
  rooms: [
    {
      chatId: 'chat-uuid-1',
      name: 'Room 1',
      participantCount: 3,
      lastActivity: '2025-01-09T21:30:00.000Z'
    }
  ]
}
```

### Get Room Online Users

**Event:** `room:online`
**Authentication:** Required

Get list of currently online users in a specific room.

**Request:**

```javascript
socket.emit(
  "room:online",
  {
    chatId: "chat-uuid",
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  onlineUsers: [
    {
      userId: 'user-uuid',
      username: 'username',
      status: 'online',
      lastSeen: '2025-01-09T21:30:00.000Z',
      connectedAt: '2025-01-09T21:25:00.000Z'
    }
  ]
}
```

---

## Real-time Messaging

### Send Message

**Event:** `message:send`
**Authentication:** Required

Send a message to a specific chat room.

**Request:**

```javascript
socket.emit(
  "message:send",
  {
    chatId: "chat-uuid",
    content: "Hello, world!",
    type: "text", // 'text', 'image', 'file', etc.
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  message: 'Message sent successfully',
  sentMessage: {
    id: 'message-uuid',
    content: 'Hello, world!',
    type: 'text',
    chatId: 'chat-uuid',
    userId: 'user-uuid',
    createdAt: '2025-01-09T21:30:00.000Z',
    user: {
      id: 'user-uuid',
      username: 'username'
    }
  }
}
```

**Events Emitted:**

- `message:new` - Broadcasted to all room participants
- `message:sent` - Sent to the message sender

### Typing Indicators

**Event:** `message:typing`
**Authentication:** Required

Indicate that the user is typing in a chat room.

**Request:**

```javascript
socket.emit(
  "message:typing",
  {
    chatId: "chat-uuid",
    isTyping: true, // or false to stop typing
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  message: 'Typing status updated'
}
```

**Events Emitted:**

- `user:typing` - Broadcasted to all room participants

### Get Typing Users

**Event:** `message:typing-users`
**Authentication:** Required

Get list of users currently typing in a chat room.

**Request:**

```javascript
socket.emit(
  "message:typing-users",
  {
    chatId: "chat-uuid",
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  typingUsers: [
    {
      userId: 'user-uuid',
      username: 'username',
      chatId: 'chat-uuid',
      startedAt: '2025-01-09T21:30:00.000Z'
    }
  ]
}
```

### Message Delivery Confirmation

**Event:** `message:delivered`
**Authentication:** Required

Confirm that a message has been delivered to the user.

**Request:**

```javascript
socket.emit(
  "message:delivered",
  {
    messageId: "message-uuid",
    chatId: "chat-uuid",
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  message: 'Delivery confirmed'
}
```

**Events Emitted:**

- `message:delivered` - Broadcasted to all room participants

### Message Read Confirmation

**Event:** `message:read`
**Authentication:** Required

Confirm that a message has been read by the user.

**Request:**

```javascript
socket.emit(
  "message:read",
  {
    messageId: "message-uuid",
    chatId: "chat-uuid",
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  message: 'Read confirmation recorded'
}
```

**Events Emitted:**

- `message:read` - Broadcasted to all room participants

### Get Message Delivery Status

**Event:** `message:delivery-status`
**Authentication:** Required

Get delivery and read status for a specific message.

**Request:**

```javascript
socket.emit(
  "message:delivery-status",
  {
    messageId: "message-uuid",
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  status: {
    messageId: 'message-uuid',
    deliveredTo: ['user-uuid-1', 'user-uuid-2'],
    readBy: ['user-uuid-1'],
    sentAt: '2025-01-09T21:30:00.000Z',
    lastUpdate: '2025-01-09T21:31:00.000Z'
  }
}
```

### Get Messaging Statistics

**Event:** `message:stats`
**Authentication:** Required

Get overall messaging statistics.

**Request:**

```javascript
socket.emit("message:stats", {}, (response) => {
  console.log(response);
});
```

**Response:**

```javascript
{
  success: true,
  stats: {
    activeTypingUsers: 2,
    trackedMessages: 150,
    totalDelivered: 145,
    totalRead: 140
  }
}
```

---

## Presence Management

### Update User Status

**Event:** `presence:update-status`
**Authentication:** Required

Update the user's presence status.

**Request:**

```javascript
socket.emit(
  "presence:update-status",
  {
    status: "away", // 'online', 'away', 'busy'
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  message: 'Status updated successfully'
}
```

**Events Emitted:**

- `user:status-changed` - Broadcasted to all connected users

### Get Online Users

**Event:** `presence:online-users`
**Authentication:** Required

Get list of all currently online users.

**Request:**

```javascript
socket.emit("presence:online-users", {}, (response) => {
  console.log(response);
});
```

**Response:**

```javascript
{
  success: true,
  users: [
    {
      userId: 'user-uuid',
      username: 'username',
      status: 'online',
      lastSeen: '2025-01-09T21:30:00.000Z',
      connectedAt: '2025-01-09T21:25:00.000Z'
    }
  ]
}
```

### Get User Status

**Event:** `presence:user-status`
**Authentication:** Required

Get presence status for a specific user.

**Request:**

```javascript
socket.emit(
  "presence:user-status",
  {
    userId: "user-uuid",
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  presence: {
    userId: 'user-uuid',
    username: 'username',
    email: 'user@example.com',
    status: 'online',
    lastSeen: '2025-01-09T21:30:00.000Z',
    connectedAt: '2025-01-09T21:25:00.000Z',
    socketId: 'socket-id',
    userAgent: 'Mozilla/5.0...',
    ipAddress: '192.168.1.1'
  }
}
```

### Get Presence Statistics

**Event:** `presence:stats`
**Authentication:** Required

Get overall presence statistics.

**Request:**

```javascript
socket.emit("presence:stats", {}, (response) => {
  console.log(response);
});
```

**Response:**

```javascript
{
  success: true,
  stats: {
    totalUsers: 50,
    onlineUsers: 15,
    awayUsers: 5,
    busyUsers: 2,
    offlineUsers: 28
  }
}
```

---

## Connection Recovery

### Create Connection Session

**Event:** `connection:create-session`
**Authentication:** Required

Create a recovery session for connection restoration.

**Request:**

```javascript
socket.emit("connection:create-session", {}, (response) => {
  console.log(response);
});
```

**Response:**

```javascript
{
  success: true,
  recoveryToken: 'recovery-token-string'
}
```

**Events Emitted:**

- `connection:recovery-token` - Sent to the client with token details

### Recover Connection

**Event:** `connection:recover`
**Authentication:** Required

Recover a connection using a recovery token.

**Request:**

```javascript
socket.emit(
  "connection:recover",
  {
    recoveryToken: "recovery-token-string",
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  message: 'Connection recovered successfully',
  session: {
    userId: 'user-uuid',
    socketId: 'new-socket-id',
    connectedAt: '2025-01-09T21:25:00.000Z',
    lastActivity: '2025-01-09T21:30:00.000Z',
    rooms: ['chat-uuid-1', 'chat-uuid-2'],
    messageQueue: [],
    recoveryToken: 'recovery-token-string'
  }
}
```

**Events Emitted:**

- `connection:recovered` - Sent to the client
- `connection:queued-messages` - Sent if there are queued messages

### Get Session Information

**Event:** `connection:session-info`
**Authentication:** Required

Get current session information.

**Request:**

```javascript
socket.emit("connection:session-info", {}, (response) => {
  console.log(response);
});
```

**Response:**

```javascript
{
  success: true,
  sessionInfo: {
    userId: 'user-uuid',
    socketId: 'socket-id',
    connectedAt: '2025-01-09T21:25:00.000Z',
    lastActivity: '2025-01-09T21:30:00.000Z',
    rooms: ['chat-uuid-1'],
    messageQueue: [],
    recoveryToken: 'recovery-token-string'
  }
}
```

### Get Connection Statistics

**Event:** `connection:stats`
**Authentication:** Required

Get connection recovery statistics.

**Request:**

```javascript
socket.emit("connection:stats", {}, (response) => {
  console.log(response);
});
```

**Response:**

```javascript
{
  success: true,
  stats: {
    activeSessions: 25,
    recoveryTokens: 25,
    queuedMessages: 5,
    averageSessionAge: 15 // minutes
  }
}
```

---

## Connection Monitoring

### Get Connection Metrics

**Event:** `monitoring:metrics`
**Authentication:** Required

Get real-time connection metrics.

**Request:**

```javascript
socket.emit("monitoring:metrics", {}, (response) => {
  console.log(response);
});
```

**Response:**

```javascript
{
  success: true,
  metrics: {
    totalConnections: 100,
    activeConnections: 25,
    failedConnections: 5,
    averageConnectionDuration: 30000, // milliseconds
    peakConnections: 50,
    connectionsPerMinute: 10,
    lastReset: '2025-01-09T21:00:00.000Z'
  }
}
```

### Get Connection Events

**Event:** `monitoring:events`
**Authentication:** Required

Get connection events with optional filtering.

**Request:**

```javascript
socket.emit(
  "monitoring:events",
  {
    limit: 50,
    type: "connect", // optional: 'connect', 'disconnect', 'error', 'rate_limit', 'auth_failure'
    userId: "user-uuid", // optional
    ip: "192.168.1.1", // optional
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```javascript
{
  success: true,
  events: [
    {
      type: 'connect',
      socketId: 'socket-id',
      userId: 'user-uuid',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      timestamp: '2025-01-09T21:30:00.000Z',
      details: {}
    }
  ]
}
```

### Get Monitoring Statistics

**Event:** `monitoring:stats`
**Authentication:** Required

Get comprehensive monitoring statistics.

**Request:**

```javascript
socket.emit("monitoring:stats", {}, (response) => {
  console.log(response);
});
```

**Response:**

```javascript
{
  success: true,
  stats: {
    metrics: {
      totalConnections: 100,
      activeConnections: 25,
      failedConnections: 5,
      averageConnectionDuration: 30000,
      peakConnections: 50,
      connectionsPerMinute: 10,
      lastReset: '2025-01-09T21:00:00.000Z'
    },
    recentEvents: [...],
    topIPs: [
      { ip: '192.168.1.1', count: 25 },
      { ip: '192.168.1.2', count: 20 }
    ],
    topUserAgents: [
      { userAgent: 'Mozilla/5.0...', count: 30 },
      { userAgent: 'Chrome/91.0...', count: 25 }
    ],
    errorRate: 0.05 // 5%
  }
}
```

### Get Health Status

**Event:** `monitoring:health`
**Authentication:** Required

Get system health status with recommendations.

**Request:**

```javascript
socket.emit("monitoring:health", {}, (response) => {
  console.log(response);
});
```

**Response:**

```javascript
{
  success: true,
  health: {
    status: 'healthy', // 'healthy', 'warning', 'critical'
    issues: [],
    recommendations: []
  }
}
```

**Health Status Levels:**

- **healthy**: System operating normally
- **warning**: Some issues detected, monitoring recommended
- **critical**: Significant issues detected, immediate attention required

---

## Broadcast Events

These events are automatically broadcasted by the server and should be listened for by clients:

### User Events

- `user:online` - User came online
- `user:offline` - User went offline
- `user:status-changed` - User status changed
- `user:joined` - User joined a room
- `user:left` - User left a room
- `user:typing` - User typing status changed

### Room Events

- `room:joined` - Successfully joined a room
- `room:left` - Successfully left a room
- `room:online-update` - Room online users updated
- `room:info` - Room information updated

### Message Events

- `message:new` - New message received
- `message:sent` - Message sent confirmation
- `message:delivered` - Message delivery confirmation
- `message:read` - Message read confirmation

### Connection Events

- `connection:recovery-token` - Recovery token received
- `connection:recovered` - Connection recovered
- `connection:queued-messages` - Queued messages received

### Presence Events

- `users:online` - Online users list updated

---

## Error Handling

All WebSocket events return a response object with the following structure:

```javascript
{
  success: boolean,
  message: string,
  // Additional data based on the event
}
```

**Common Error Responses:**

```javascript
// Authentication error
{
  success: false,
  message: 'User not authenticated'
}

// Rate limit error
{
  success: false,
  message: 'Message rate limit exceeded. Please slow down.'
}

// Validation error
{
  success: false,
  message: 'Invalid request data'
}

// Not found error
{
  success: false,
  message: 'Chat not found or access denied'
}
```

---

## Rate Limiting

The WebSocket API implements rate limiting to prevent abuse:

### Connection Rate Limiting

- **Limit**: 5 connection attempts per 5 minutes per IP
- **Block Duration**: 15 minutes
- **Scope**: Per IP address

### Message Rate Limiting

- **Limit**: 100 messages per minute per user
- **Scope**: Per authenticated user

### Typing Rate Limiting

- **Limit**: 10 typing events per minute per user
- **Scope**: Per authenticated user

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT authentication
2. **Origin Validation**: Connections are validated against allowed origins
3. **Rate Limiting**: Comprehensive rate limiting prevents abuse
4. **Input Validation**: All input data is validated and sanitized
5. **Error Handling**: Secure error messages that don't leak sensitive information

---

## Client Implementation Example

```javascript
import { io } from "socket.io-client";

class WebSocketClient {
  constructor(token) {
    this.socket = io("ws://localhost:3001/chat", {
      auth: { token },
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Connection events
    this.socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket");
    });

    // Message events
    this.socket.on("message:new", (message) => {
      console.log("New message:", message);
    });

    this.socket.on("user:typing", (data) => {
      console.log("User typing:", data);
    });

    // Presence events
    this.socket.on("user:online", (user) => {
      console.log("User online:", user);
    });

    this.socket.on("user:offline", (user) => {
      console.log("User offline:", user);
    });
  }

  joinRoom(chatId) {
    return new Promise((resolve, reject) => {
      this.socket.emit("join:chat", { chatId }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  sendMessage(chatId, content, type = "text") {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "message:send",
        {
          chatId,
          content,
          type,
        },
        (response) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.message));
          }
        }
      );
    });
  }

  setTyping(chatId, isTyping) {
    this.socket.emit("message:typing", { chatId, isTyping });
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const client = new WebSocketClient("your-jwt-token");
await client.joinRoom("chat-uuid");
await client.sendMessage("chat-uuid", "Hello, world!");
client.setTyping("chat-uuid", true);
```

---

## Testing

The WebSocket API includes comprehensive testing:

### Unit Tests

- Service-level unit tests for all WebSocket services
- Mock-based testing for isolated functionality
- Coverage of error scenarios and edge cases

### Integration Tests

- End-to-end WebSocket connection testing
- Real-time event broadcasting verification
- Authentication and authorization testing
- Rate limiting validation

### Manual Testing

- Real-time message delivery verification
- Presence status synchronization testing
- Connection recovery functionality validation
- Performance and scalability testing

---

## Performance Considerations

1. **Connection Pooling**: Efficient connection management
2. **Event Batching**: Optimized event broadcasting
3. **Memory Management**: Automatic cleanup of old data
4. **Rate Limiting**: Prevents system overload
5. **Monitoring**: Real-time performance metrics

---

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify JWT token is valid and not expired
   - Check if server is running on correct port
   - Ensure CORS settings allow your origin

2. **Authentication Errors**
   - Verify token format and signature
   - Check if user account is active and verified
   - Ensure token hasn't expired

3. **Rate Limiting**
   - Reduce message frequency
   - Implement client-side rate limiting
   - Check connection patterns

4. **Message Not Received**
   - Verify room membership
   - Check if user is online
   - Ensure proper event listeners are set up

### Debug Mode

Enable debug logging by setting the log level to 'debug' in the server configuration.

---

## Changelog

### Version 1.0.0

- Initial WebSocket API implementation
- Room management functionality
- Real-time messaging
- Presence management
- Connection recovery
- Connection monitoring
- Comprehensive rate limiting
- Security features
