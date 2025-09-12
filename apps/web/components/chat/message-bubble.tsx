'use client';

import { Message } from '@t3-chat/types';
import { cn } from '@t3-chat/utils';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { MarkdownRenderer } from './markdown-renderer';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onRead?: () => void;
}

export function MessageBubble({ message, isOwn, onRead }: MessageBubbleProps) {
  const getMessageStatus = () => {
    // This would typically come from the message metadata or real-time status
    // For now, we'll simulate different states
    if (isOwn) {
      return 'delivered'; // or 'sent', 'read'
    }
    return null;
  };

  const status = getMessageStatus();
  const isAI = message.metadata?.isAI === true;
  const aiModel = message.metadata?.model;
  const hasError = message.metadata?.error === true;

  const renderMessageContent = () => {
    switch (message.type) {
      case 'TEXT':
        return (
          <MarkdownRenderer 
            content={message.content}
            className="whitespace-pre-wrap break-words"
          />
        );
      case 'IMAGE':
        return (
          <div className="space-y-2">
            <img
              src={message.content}
              alt="Shared image"
              className="max-w-xs rounded-lg"
            />
            {message.metadata?.caption && (
              <p className="text-sm text-gray-600">{message.metadata.caption}</p>
            )}
          </div>
        );
      case 'FILE':
        return (
          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
              📄
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {message.metadata?.filename || 'File'}
              </p>
              <p className="text-xs text-gray-500">
                {message.metadata?.size ? `${(message.metadata.size / 1024).toFixed(1)} KB` : ''}
              </p>
            </div>
          </div>
        );
      case 'SYSTEM':
        return (
          <div className="text-center text-sm text-gray-500 italic">
            {message.content}
          </div>
        );
      default:
        return <div>{message.content}</div>;
    }
  };

  const renderStatusIcon = () => {
    if (!isOwn || !status) return null;

    switch (status) {
      case 'sent':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative max-w-xs lg:max-w-md',
        isOwn ? 'ml-auto' : 'mr-auto'
      )}
    >
      {/* AI Model Badge */}
      {isAI && (
        <div className="flex items-center justify-start mb-1">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            🤖 {aiModel || 'AI'} {hasError && '⚠️'}
          </span>
        </div>
      )}
      <div
        className={cn(
          'rounded-2xl px-4 py-2 shadow-sm',
          isOwn
            ? 'bg-blue-500 text-white'
            : isAI
              ? hasError 
                ? 'bg-red-50 text-red-900 border border-red-200'
                : 'bg-gradient-to-r from-blue-50 to-purple-50 text-gray-900 border border-blue-200'
              : 'bg-gray-100 text-gray-900'
        )}
      >
        {renderMessageContent()}
      </div>
      
      {/* Status and timestamp */}
      {isOwn && (
        <div className="flex items-center justify-end mt-1 space-x-1">
          <span className="text-xs text-gray-500">
            {new Date(message.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {renderStatusIcon()}
        </div>
      )}
    </div>
  );
}
