'use client';

import { useEffect, useRef } from 'react';
import { Message, User } from '@t3-chat/types';
import { formatTime, getInitials } from '@t3-chat/utils';
import { MessageBubble } from './message-bubble';

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  onMessageRead?: (messageId: string) => void;
}

export function MessageList({ messages, currentUser, onMessageRead }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach((message) => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
          <p className="text-sm">Start the conversation by sending a message</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date}>
          {/* Date separator */}
          <div className="flex items-center justify-center my-4">
            <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          {/* Messages for this date */}
          <div className="space-y-2">
            {dateMessages.map((message, index) => {
              const isOwnMessage = message.userId === currentUser.id;
              const prevMessage = index > 0 ? dateMessages[index - 1] : null;
              const showAvatar = !prevMessage || prevMessage.userId !== message.userId;
              const showTime = !prevMessage || 
                new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000; // 5 minutes

              return (
                <div key={message.id} className="flex items-end space-x-2">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {showAvatar ? (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {message.user.avatar ? (
                          <img
                            src={message.user.avatar}
                            alt={message.user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-gray-600">
                            {getInitials(message.user.firstName, message.user.lastName)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-8 h-8"></div>
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    {showAvatar && (
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {message.user.firstName} {message.user.lastName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    )}
                    
                    <MessageBubble
                      message={message}
                      isOwn={isOwnMessage}
                      onRead={() => onMessageRead?.(message.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
