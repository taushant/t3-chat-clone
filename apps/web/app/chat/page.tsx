'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatHeader } from '@/components/chat/chat-header';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { TypingIndicatorComponent } from '@/components/chat/typing-indicator';
import { ChatSettingsModal } from '@/components/chat/chat-settings-modal';
import { Chat, Message, User, TypingIndicator } from '@t3-chat/types';
import { apiClient } from '@/lib/api-client';
import { wsManager } from '@/lib/websocket';
import { useChats, useCreateChat } from '@/hooks/use-chats';
import { useMessages, useCreateMessage } from '@/hooks/use-messages';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Data fetching
  const { data: chats = [], isLoading: chatsLoading } = useChats();
  
  // Ensure chats is always an array
  const safeChats = useMemo(() => Array.isArray(chats) ? chats : [], [chats]);
  const { data: messages = [], isLoading: messagesLoading } = useMessages(currentChat?.id || '');
  const createChatMutation = useCreateChat();
  const createMessageMutation = useCreateMessage();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (session?.accessToken) {
      apiClient.setAuthToken(session.accessToken);
      wsManager.connect();
    }

    return () => {
      wsManager.disconnect();
    };
  }, [session]);

  // Set up WebSocket event listeners
  useEffect(() => {
    const handleMessageReceived = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleTyping = (data: TypingIndicator) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        if (data.isTyping) {
          return [...filtered, data];
        }
        return filtered;
      });
    };

    const handlePresenceOnline = (data: { userId: string; status: string }) => {
      setOnlineUsers(prev => {
        if (!prev.includes(data.userId)) {
          return [...prev, data.userId];
        }
        return prev;
      });
    };

    const handlePresenceOffline = (data: { userId: string }) => {
      setOnlineUsers(prev => prev.filter(id => id !== data.userId));
    };

    // Register event listeners
    wsManager.on('message:received', handleMessageReceived);
    wsManager.on('message:typing', handleTyping);
    wsManager.on('presence:online', handlePresenceOnline);
    wsManager.on('presence:offline', handlePresenceOffline);

    return () => {
      wsManager.off('message:received', handleMessageReceived);
      wsManager.off('message:typing', handleTyping);
      wsManager.off('presence:online', handlePresenceOnline);
      wsManager.off('presence:offline', handlePresenceOffline);
    };
  }, []);

  // Select first chat if available
  useEffect(() => {
    if (safeChats.length > 0 && !currentChat) {
      setCurrentChat(safeChats[0]);
    }
  }, [safeChats, currentChat]);

  // Join/leave chat room when chat changes
  useEffect(() => {
    if (currentChat) {
      wsManager.joinChat(currentChat.id);
    }

    return () => {
      if (currentChat) {
        wsManager.leaveChat(currentChat.id);
      }
    };
  }, [currentChat]);

  const handleChatSelect = (chatId: string) => {
    const chat = safeChats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChat(chat);
    }
  };

  const handleCreateChat = async () => {
    try {
      const timestamp = new Date().toLocaleString();
      const newChat = await createChatMutation.mutateAsync({
        title: `AI Chat - ${timestamp}`,
        description: 'Chat with AI Assistant (GPT-4)',
        isPublic: false,
      });
      
      setCurrentChat(newChat);
    } catch (error) {
      setError('Failed to create chat');
      console.error('Error creating chat:', error);
    }
  };

  const handleSendMessage = async (content: string, type: string) => {
    if (!currentChat) return;

    try {
      // Send user message
      await createMessageMutation.mutateAsync({
        content,
        type: type as 'TEXT' | 'IMAGE' | 'FILE',
        chatId: currentChat.id,
      });

      // If this is an AI chat (based on title), generate AI response
      if (currentChat.title?.includes('AI Chat')) {
        // Simulate AI thinking delay
        setTimeout(async () => {
          try {
            // Generate AI response using the LLM service
            const aiResponse = await apiClient.post('/llm/chat/completion', {
              messages: [
                {
                  role: 'user',
                  content: content,
                }
              ],
              model: 'gpt-4',
              provider: 'openai',
              stream: false,
            });

            // Send AI response as a message
            await createMessageMutation.mutateAsync({
              content: aiResponse.choices?.[0]?.message?.content || 'I\'m sorry, I couldn\'t generate a response.',
              type: 'TEXT',
              chatId: currentChat.id,
              metadata: {
                isAI: true,
                model: 'gpt-4',
                provider: 'openai'
              }
            });
          } catch (aiError) {
            console.error('AI response error:', aiError);
            // Send fallback message
            await createMessageMutation.mutateAsync({
              content: 'I\'m experiencing some technical difficulties. Please try again later.',
              type: 'TEXT',
              chatId: currentChat.id,
              metadata: {
                isAI: true,
                error: true
              }
            });
          }
        }, 1000);
      }
    } catch (error) {
      setError('Failed to send message');
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (currentChat) {
      wsManager.sendTyping(currentChat.id, isTyping);
    }
  };

  const handleMessageRead = (messageId: string) => {
    if (currentChat) {
      wsManager.markMessageAsRead(messageId, currentChat.id);
    }
  };

  const handleSearch = async (query: string) => {
    // This would typically trigger a new query with search parameters
    // For now, we'll just log it
    console.log('Searching for:', query);
  };

  if (status === 'loading' || chatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <ChatSidebar
        chats={safeChats}
        currentChatId={currentChat?.id}
        onChatSelect={handleChatSelect}
        onCreateChat={handleCreateChat}
        onSearch={handleSearch}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            {/* Chat header */}
            <ChatHeader
              chat={currentChat}
              currentUser={session.user as User}
              onlineUsers={onlineUsers}
              onSettingsClick={() => setShowSettings(true)}
            />

            {/* Messages */}
            {messagesLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="spinner w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading messages...</p>
                </div>
              </div>
            ) : (
              <MessageList
                messages={messages}
                currentUser={session.user as User}
                onMessageRead={handleMessageRead}
              />
            )}

            {/* Typing indicator */}
            <TypingIndicatorComponent
              typingUsers={typingUsers}
              currentUserId={session.user.id}
            />

            {/* Message input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
            />
          </>
        ) : (
          /* No chat selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No chat selected
              </h3>
              <p className="text-gray-500 mb-4">
                Choose a chat from the sidebar or create a new one
              </p>
              <Button onClick={handleCreateChat}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Chat settings modal */}
      {currentChat && (
        <ChatSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          chat={currentChat}
          currentUser={session.user as User}
        />
      )}
    </div>
  );
}
