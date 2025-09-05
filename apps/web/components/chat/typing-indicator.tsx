'use client';

import { TypingIndicator } from '@t3-chat/types';
import { cn } from '@t3-chat/utils';

interface TypingIndicatorProps {
  typingUsers: TypingIndicator[];
  currentUserId: string;
}

export function TypingIndicatorComponent({ typingUsers, currentUserId }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const otherTypingUsers = typingUsers.filter(user => user.userId !== currentUserId);
  
  if (otherTypingUsers.length === 0) return null;

  const getTypingText = () => {
    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0].userId} is typing...`;
    } else if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0].userId} and ${otherTypingUsers[1].userId} are typing...`;
    } else {
      return `${otherTypingUsers.length} people are typing...`;
    }
  };

  return (
    <div className="px-4 py-2 text-sm text-gray-500 italic">
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <span>{getTypingText()}</span>
      </div>
    </div>
  );
}
