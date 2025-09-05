'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, MessageSquare, Users, Settings } from 'lucide-react';
import { Chat } from '@t3-chat/types';
import { formatDate, truncateText } from '@t3-chat/utils';

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
  onCreateChat: () => void;
  onSearch: (query: string) => void;
}

export function ChatSidebar({
  chats,
  currentChatId,
  onChatSelect,
  onCreateChat,
  onSearch,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
          <Button onClick={onCreateChat} size="sm" className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </form>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No chats yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Create your first chat to get started
            </p>
          </div>
        ) : (
          <div className="p-2">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className={`mb-2 cursor-pointer transition-colors hover:bg-gray-50 ${
                  currentChatId === chat.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => onChatSelect(chat.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-gray-900 truncate">
                        {chat.title}
                      </h3>
                      {chat.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {truncateText(chat.description, 50)}
                        </p>
                      )}
                      <div className="flex items-center mt-2 text-xs text-gray-400">
                        <Users className="h-3 w-3 mr-1" />
                        <span>{chat.participants.length} participants</span>
                        <span className="mx-2">•</span>
                        <span>{formatDate(chat.updatedAt)}</span>
                      </div>
                    </div>
                    {chat.isPublic && (
                      <div className="ml-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Button variant="ghost" className="w-full justify-start">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
}
