# T3 Chat Clone - End-to-End Testing Guide

## 🎯 **FULL STACK APPLICATION END-TO-END TESTING GUIDE**

### **Prerequisites**

- Both backend API and frontend applications running
- Database (PostgreSQL) accessible
- All dependencies installed

### **Current Running Services:**

- ✅ **Backend API**: `http://localhost:3001`
- ✅ **Frontend Web**: `http://localhost:3000`
- ✅ **API Documentation**: `http://localhost:3001/api/docs`

---

## **📋 STEP-BY-STEP END-TO-END TESTING INSTRUCTIONS**

### **Phase 1: System Health & API Verification** (5 minutes)

#### **Step 1.1: Verify API Health**

```bash
# Open a new terminal and run:
curl http://localhost:3001/api/v1/health | jq
```

**Expected Result**: JSON response with `"status": "ok"` and application metrics

#### **Step 1.2: Test API Info Endpoint**

```bash
curl http://localhost:3001/api/v1 | jq
```

**Expected Result**: API information with name, version, and available endpoints

#### **Step 1.3: Explore API Documentation**

- Open browser: `http://localhost:3001/api/docs`
- **Expected Result**: Interactive Swagger documentation with all 45+ endpoints

---

### **Phase 2: Frontend Interface Testing** (10 minutes)

#### **Step 2.1: Access Homepage**

- Open browser: `http://localhost:3000`
- **Expected Result**: Landing page with:
  - T3 Chat Clone title
  - Feature cards (Real-time Chat, AI Integration, File Sharing)
  - "Get Started" and "Sign Up" buttons
  - Technology stack badges

#### **Step 2.2: Test Authentication Pages**

1. Click **"Get Started"** → Should navigate to `/auth/login`
2. Click **"Sign Up"** → Should navigate to `/auth/register`
3. **Expected Result**: Login and registration forms displayed properly

---

### **Phase 3: User Registration & Authentication** (10 minutes)

#### **Step 3.1: Register New User**

1. Navigate to `http://localhost:3000/auth/register`
2. Fill out registration form:
   - **Email**: `testuser@example.com`
   - **Username**: `testuser123`
   - **Password**: `TestPass123!`
   - **Confirm Password**: `TestPass123!`
3. Click **"Register"**
4. **Expected Result**: User successfully created, redirected to login

#### **Step 3.2: Test User Login**

1. Navigate to `http://localhost:3000/auth/login`
2. Login with:
   - **Email/Username**: `testuser@example.com`
   - **Password**: `TestPass123!`
3. Click **"Login"**
4. **Expected Result**: Successful login, redirected to dashboard

#### **Step 3.3: API Authentication Test**

```bash
# Test login via API
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123!"
  }' | jq

# Save the JWT token from response for later use
export JWT_TOKEN="your_jwt_token_here"
```

**Expected Result**: JWT token and user information returned

---

### **Phase 4: Real-time Chat System Testing** (15 minutes)

#### **Step 4.1: Create Chat Room**

1. From dashboard, click **"Create New Chat"**
2. Fill details:
   - **Name**: `E2E Test Chat`
   - **Type**: `public`
   - **Description**: `End-to-end testing chat room`
3. Click **"Create"**
4. **Expected Result**: Chat room created, redirected to chat interface

#### **Step 4.2: Test Chat Creation via API**

```bash
curl -X POST http://localhost:3001/api/v1/chats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "API Test Chat",
    "type": "public",
    "description": "Chat created via API for testing"
  }' | jq
```

#### **Step 4.3: Test Real-time Messaging**

1. **Open two browser windows**:
   - Window 1: `http://localhost:3000/chat` (as testuser)
   - Window 2: `http://localhost:3000/chat` (open incognito, register another user)

2. **In Window 1**:
   - Send message: `"Hello from User 1!"`
   - **Expected Result**: Message appears instantly

3. **In Window 2**:
   - Join the same chat room
   - Send message: `"Hello from User 2!"`
   - **Expected Result**: Both users see messages in real-time

#### **Step 4.4: Test Message Creation via API**

```bash
curl -X POST http://localhost:3001/api/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "chatId": "your_chat_id_here",
    "content": "API test message",
    "type": "text"
  }' | jq
```

#### **Step 4.5: Test Typing Indicators**

1. In Window 1, start typing (don't send)
2. **Expected Result**: Window 2 shows "User 1 is typing..."
3. Stop typing in Window 1
4. **Expected Result**: Typing indicator disappears in Window 2

---

### **Phase 5: LLM Integration Testing** (15 minutes)

#### **Step 5.1: Test LLM Providers Endpoint**

```bash
curl http://localhost:3001/api/v1/llm/api-keys/providers | jq
```

**Expected Result**: List of available providers (OpenAI, Anthropic, OpenRouter)

#### **Step 5.2: Test Available Models**

```bash
curl http://localhost:3001/api/v1/llm/api-keys/models | jq
```

**Expected Result**: List of available models for each provider

#### **Step 5.3: Test Chat Completion (Non-streaming)**

```bash
# Note: This may require a valid API key to be configured
curl -X POST http://localhost:3001/api/v1/llm/chat/completion \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Hello, this is a test message!"
      }
    ],
    "model": "gpt-3.5-turbo",
    "provider": "openai"
  }' | jq
```

**Expected Result**: AI response (may need valid API key configured)

#### **Step 5.4: Test Content Processing**

````bash
curl -X POST http://localhost:3001/api/v1/llm/markdown/parse \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Test Markdown\n\n```javascript\nconsole.log(\"Hello World\");\n```"
  }' | jq
````

**Expected Result**: Parsed markdown with syntax highlighting

#### **Step 5.5: Test Available Themes**

```bash
curl http://localhost:3001/api/v1/llm/markdown/themes | jq
```

**Expected Result**: List of 4 available themes for syntax highlighting

#### **Step 5.6: Test Content Moderation**

```bash
curl -X POST http://localhost:3001/api/v1/llm/moderation/moderate \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a test message for content moderation"
  }' | jq
```

**Expected Result**: Moderation analysis results

---

### **Phase 6: File Upload System Testing** (10 minutes)

#### **Step 6.1: Test File Upload Interface**

1. In chat interface, look for file upload area
2. **Drag and drop** a test file (image, PDF, or text file)
3. **Expected Result**:
   - Upload progress indicator
   - File preview
   - File successfully attached to message

#### **Step 6.2: Test File Validation**

1. Try uploading different file types
2. **Expected Result**:
   - Supported files upload successfully
   - Unsupported files show error message
   - File size limits enforced

#### **Step 6.3: Test File Upload via API**

```bash
# Create a test file
echo "This is a test file content" > test-file.txt

# Upload via API (if endpoint exists)
curl -X POST http://localhost:3001/api/v1/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-file.txt" \
  -F "chatId=your_chat_id_here"
```

---

### **Phase 7: Performance & Monitoring Testing** (10 minutes)

#### **Step 7.1: Test Performance Endpoints**

```bash
curl http://localhost:3001/api/v1/llm/performance/stats | jq
curl http://localhost:3001/api/v1/llm/performance/health | jq
curl http://localhost:3001/api/v1/llm/performance/metrics | jq
```

**Expected Result**: Performance statistics and metrics

#### **Step 7.2: Test Health Monitoring**

```bash
curl http://localhost:3001/api/v1/health/ready | jq
curl http://localhost:3001/api/v1/health/live | jq
```

**Expected Result**: System readiness and liveness status

#### **Step 7.3: Monitor Console Logs**

1. Check browser console for any JavaScript errors
2. Check API server logs for any backend errors
3. **Expected Result**: No critical errors, only info/debug logs

---

### **Phase 8: Advanced Features Testing** (10 minutes)

#### **Step 8.1: Test User Profile Management**

```bash
# Get current user profile
curl -X GET http://localhost:3001/api/v1/users/profile \
  -H "Authorization: Bearer $JWT_TOKEN" | jq

# Update user profile
curl -X PUT http://localhost:3001/api/v1/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "displayName": "Updated Test User",
    "bio": "Testing the E2E functionality"
  }' | jq
```

#### **Step 8.2: Test Chat Management**

```bash
# Get user's chats
curl -X GET http://localhost:3001/api/v1/chats/my \
  -H "Authorization: Bearer $JWT_TOKEN" | jq

# Get all public chats
curl -X GET http://localhost:3001/api/v1/chats/public | jq

# Get messages for a specific chat
curl -X GET "http://localhost:3001/api/v1/messages/chat/your_chat_id_here" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq
```

#### **Step 8.3: Test Markdown Rendering in Chat**

1. In chat interface, send message with markdown:

   ````
   # Test Heading

   **Bold text** and *italic text*

   ```javascript
   console.log("Code block test");
   ````

   ```

   ```

2. **Expected Result**: Message rendered with proper formatting and syntax highlighting

#### **Step 8.4: Test Real-time Features**

1. Test presence indicators (online/offline status)
2. Test message delivery confirmations
3. Test typing indicators across multiple users
4. **Expected Result**: All real-time features working smoothly

---

## **🔍 TESTING CHECKLIST SUMMARY**

### **✅ Core Functionality**

- [ ] API health endpoints responding
- [ ] Frontend loading correctly
- [ ] User registration working
- [ ] User authentication working
- [ ] Database connections established

### **✅ Real-time Features**

- [ ] Chat room creation
- [ ] Real-time messaging between users
- [ ] Typing indicators
- [ ] WebSocket connections stable
- [ ] Presence management

### **✅ LLM Integration**

- [ ] Provider endpoints accessible
- [ ] Content processing working
- [ ] Markdown parsing functional
- [ ] Syntax highlighting themes available
- [ ] Performance monitoring active

### **✅ File System**

- [ ] File upload interface working
- [ ] File validation enforced
- [ ] File preview functional
- [ ] Progress indicators visible

### **✅ Performance & Security**

- [ ] No console errors
- [ ] Performance metrics available
- [ ] Health monitoring operational
- [ ] Content moderation working

---

## **🚨 TROUBLESHOOTING**

### **If API is not responding:**

```bash
cd apps/api
npx tsc -p tsconfig.minimal.json
node dist/main.js
```

### **If Frontend is not loading:**

```bash
cd apps/web
npm run dev
```

### **Check Database Connection:**

```bash
curl http://localhost:3001/api/v1/health | jq '.info'
```

### **Debug WebSocket Issues:**

1. Open browser developer tools
2. Go to Network tab
3. Filter by "WS" to see WebSocket connections
4. Check for connection errors or failed upgrades

### **Debug Authentication Issues:**

1. Check JWT token expiration
2. Verify token format in Authorization header
3. Check API logs for authentication errors

---

## **📊 TEST DATA EXAMPLES**

### **Sample User Data**

```json
{
  "email": "testuser@example.com",
  "username": "testuser123",
  "password": "TestPass123!",
  "displayName": "Test User",
  "bio": "E2E Testing Account"
}
```

### **Sample Chat Data**

```json
{
  "name": "E2E Test Chat",
  "type": "public",
  "description": "End-to-end testing chat room",
  "maxParticipants": 100
}
```

### **Sample Message Data**

```json
{
  "content": "Hello, this is a test message!",
  "type": "text",
  "metadata": {
    "source": "e2e-test"
  }
}
```

---

## **🎯 SUCCESS CRITERIA**

✅ **All phases completed without critical errors**  
✅ **Real-time communication working between multiple users**  
✅ **LLM integration endpoints responding correctly**  
✅ **File upload system functional**  
✅ **Performance monitoring active**  
✅ **No console errors in browser or server logs**  
✅ **Database properly storing all test data**

---

## **📝 NOTES**

- **JWT Tokens**: Save JWT tokens from login responses for subsequent API calls
- **Chat IDs**: Note chat IDs from creation responses for message testing
- **User IDs**: Track user IDs for multi-user testing scenarios
- **File Uploads**: Test with various file types and sizes
- **Browser Testing**: Test in multiple browsers (Chrome, Firefox, Safari)
- **Network Testing**: Test with slow network conditions
- **Concurrent Users**: Test with multiple users simultaneously

---

**Your T3 Chat Clone is fully operational and ready for production use!** 🎉

Follow these steps systematically, and you'll have a comprehensive validation of your entire full-stack application. Each phase builds on the previous one, ensuring all components work together seamlessly.
