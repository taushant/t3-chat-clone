# API Key Setup Guide

## 🚀 Quick Setup for Testing LLM Integration

This guide helps you set up API keys to test the T3 Chat Clone's AI chat functionality.

### 📋 Prerequisites

- T3 Chat Clone project cloned and running
- Access to get API keys from at least one LLM provider

---

## 🔑 Option 1: OpenRouter (Recommended for Testing)

**Best for**: Testing with free models and minimal cost

1. **Get API Key**:
   - Visit: https://openrouter.ai/keys
   - Sign up/login 
   - Create new API key
   - Copy the key (starts with `sk-or-...`)

2. **Configure**:
   ```bash
   cd apps/api
   cp .env.example .env  # if .env doesn't exist
   
   # Edit .env and update:
   OPENROUTER_API_KEY="sk-or-your-actual-key-here"
   ```

3. **Free Models Available**:
   - Meta Llama 3.1 8B (Free)
   - Mistral 7B (Free) 
   - Anthropic Claude Haiku (Very cheap)
   - Many others

4. **Test**:
   ```bash
   # Restart API server
   npm run start:dev
   
   # Test endpoint
   curl -X POST http://localhost:3001/api/v1/llm/chat/completion \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [{"role": "user", "content": "Hello!"}],
       "model": "meta-llama/llama-3.1-8b-instruct:free",
       "provider": "openrouter"
     }'
   ```

---

## 🔑 Option 2: OpenAI (Premium Quality)

**Best for**: Highest quality responses, production use

1. **Get API Key**:
   - Visit: https://platform.openai.com/api-keys
   - Sign up/login
   - Add billing method (minimum $5)
   - Create new API key
   - Copy the key (starts with `sk-proj-...`)

2. **Configure**:
   ```bash
   # Edit apps/api/.env:
   OPENAI_API_KEY="sk-proj-your-actual-key-here"
   ```

3. **Cost**: ~$0.03-0.06 per conversation (very affordable)

4. **Test**:
   ```bash
   curl -X POST http://localhost:3001/api/v1/llm/chat/completion \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [{"role": "user", "content": "Hello!"}],
       "model": "gpt-3.5-turbo",
       "provider": "openai"
     }'
   ```

---

## 🔑 Option 3: Anthropic (Advanced Reasoning)

**Best for**: Complex reasoning tasks, longer contexts

1. **Get API Key**:
   - Visit: https://console.anthropic.com/
   - Sign up/login
   - Add billing 
   - Create new API key
   - Copy the key (starts with `sk-ant-...`)

2. **Configure**:
   ```bash
   # Edit apps/api/.env:
   ANTHROPIC_API_KEY="sk-ant-your-actual-key-here"
   ```

3. **Test**:
   ```bash
   curl -X POST http://localhost:3001/api/v1/llm/chat/completion \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [{"role": "user", "content": "Hello!"}],
       "model": "claude-3-haiku-20240307",
       "provider": "anthropic"
     }'
   ```

---

## 🧪 Testing the Frontend Integration

1. **Start the applications**:
   ```bash
   # Terminal 1: Start API
   cd apps/api
   npm run start:dev
   
   # Terminal 2: Start Frontend  
   cd apps/web
   npm run dev
   ```

2. **Test the chat**:
   - Open: http://localhost:3000/auth/register
   - Register a new user
   - Navigate to: http://localhost:3000/chat
   - Click "Start New Chat" 
   - Send a message like "Hello!"
   - You should see an AI response appear automatically

3. **Expected behavior**:
   - Chat title shows "AI Chat - [timestamp]"
   - Chat header shows "AI Assistant (GPT-4)" 
   - AI messages have a blue gradient background
   - AI messages show 🤖 model badge
   - Responses appear after ~1 second delay

---

## 🚨 Troubleshooting

### API Key Not Working
```bash
# Check if API key is loaded correctly
curl http://localhost:3001/api/v1/llm/api-keys/providers
```

### Server Won't Start
```bash
# Check logs for API key validation errors
cd apps/api
npm run start:dev

# Look for error like:
# "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
```

### Chat Shows Error Message
- Check browser console for error details
- Verify API server is running on http://localhost:3001
- Test API endpoint directly with curl commands above

### No AI Response
- Check if you're using placeholder API keys (`your-openai-api-key`)
- Verify at least one API key is properly configured
- Check API server logs for LLM provider errors

---

## 🎯 Success Checklist

- [ ] ✅ API key obtained from provider
- [ ] ✅ API key added to `apps/api/.env`
- [ ] ✅ API server restarts without errors
- [ ] ✅ Provider endpoint test returns valid response
- [ ] ✅ Frontend chat creates "AI Chat" successfully
- [ ] ✅ AI responds to user messages automatically
- [ ] ✅ AI messages show proper styling and model badges

---

## 💡 Next Steps

Once you have LLM integration working:

1. **Test different models** by modifying the frontend chat creation
2. **Explore the API documentation** at http://localhost:3001/api/docs
3. **Try different providers** by adding multiple API keys
4. **Monitor usage** through provider dashboards
5. **Review cost optimization** strategies for production

Your T3 Chat Clone now has fully functional AI chat capabilities! 🎉
