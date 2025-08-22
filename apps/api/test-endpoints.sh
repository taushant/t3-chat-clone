#!/bin/bash

# T3 Chat Clone API Endpoint Testing Script
# This script tests all implemented endpoints

API_BASE="http://localhost:3001/api/v1"
TOKEN=""
USER_ID=""
CHAT_ID=""
MESSAGE_ID=""

echo "🚀 Starting API Endpoint Testing..."

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=""
    
    if [[ -n "$TOKEN" ]]; then
        auth_header="-H \"Authorization: Bearer $TOKEN\""
    fi
    
    echo "Testing: $method $endpoint"
    
    if [[ "$method" == "POST" ]] || [[ "$method" == "PUT" ]] || [[ "$method" == "PATCH" ]]; then
        response=$(eval curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            $auth_header \
            -d "$data")
    else
        response=$(eval curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            $auth_header)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    echo "Status: $http_code"
    if [[ -n "$body" ]]; then
        echo "Response: $body" | head -c 200
        echo "..."
    fi
    echo "---"
}

# Test Health Endpoint
echo "📊 Testing Health Endpoints..."
test_endpoint "GET" "/health"

# Test User Registration
echo "👤 Testing Authentication Endpoints..."
register_data='{"email":"test@example.com","username":"testuser","password":"Test123!@#","firstName":"Test","lastName":"User"}'
register_response=$(curl -s -X POST "$API_BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d "$register_data")

echo "Registration Response: $register_response"

# Test User Login
login_data='{"email":"test@example.com","password":"Test123!@#"}'
login_response=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "$login_data")

echo "Login Response: $login_response"

# Extract token from login response
TOKEN=$(echo "$login_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo "$login_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [[ -n "$TOKEN" ]]; then
    echo "✅ Authentication successful, token obtained"
    echo "User ID: $USER_ID"
else
    echo "❌ Authentication failed, proceeding without token"
fi

# Test Chat Endpoints (if authenticated)
if [[ -n "$TOKEN" ]]; then
    echo "💬 Testing Chat Endpoints..."
    
    # Test Create Chat
    chat_data='{"title":"Test Chat","description":"A test chat for API testing","isPublic":false}'
    create_chat_response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/chats" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$chat_data")
    
    echo "Create Chat Response: $create_chat_response"
    
    # Extract chat ID
    CHAT_ID=$(echo "$create_chat_response" | head -n -1 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "Chat ID: $CHAT_ID"
    
    # Test other chat endpoints
    test_endpoint "GET" "/chats"
    test_endpoint "GET" "/chats/my"
    
    if [[ -n "$CHAT_ID" ]]; then
        test_endpoint "GET" "/chats/$CHAT_ID"
        
        # Test Update Chat
        update_chat_data='{"title":"Updated Test Chat","description":"Updated description"}'
        test_endpoint "PATCH" "/chats/$CHAT_ID" "$update_chat_data"
    fi
    
    # Test Message Endpoints
    echo "📝 Testing Message Endpoints..."
    
    if [[ -n "$CHAT_ID" ]]; then
        # Test Create Message
        message_data="{\"content\":\"Hello, this is a test message!\",\"type\":\"TEXT\",\"chatId\":\"$CHAT_ID\"}"
        create_message_response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/messages" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$message_data")
        
        echo "Create Message Response: $create_message_response"
        
        # Extract message ID
        MESSAGE_ID=$(echo "$create_message_response" | head -n -1 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "Message ID: $MESSAGE_ID"
        
        # Test other message endpoints
        test_endpoint "GET" "/messages"
        test_endpoint "GET" "/messages/my"
        test_endpoint "GET" "/messages/chat/$CHAT_ID"
        
        if [[ -n "$MESSAGE_ID" ]]; then
            test_endpoint "GET" "/messages/$MESSAGE_ID"
        fi
    fi
    
    echo "🧹 Cleaning up test data..."
    # Clean up: Delete the test chat and associated messages
    if [[ -n "$CHAT_ID" ]]; then
        test_endpoint "DELETE" "/chats/$CHAT_ID"
    fi
else
    echo "⚠️  Skipping authenticated endpoint tests (no token)"
fi

echo "✅ API Endpoint Testing Complete!"
