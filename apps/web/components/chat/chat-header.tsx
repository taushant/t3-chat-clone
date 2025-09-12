'use client';

import { Chat, User } from '@t3-chat/types';
import { Button } from '@/components/ui/button';
import { MoreVertical, Users, Settings, Phone, Video } from 'lucide-react';
import { useState } from 'react';

interface ChatHeaderProps {
  chat: Chat;
  currentUser: User;
  onlineUsers?: string[];
  onSettingsClick?: () => void;
  onCallClick?: () => void;
  onVideoCallClick?: () => void;
}

export function ChatHeader({
  chat,
  currentUser,
  onlineUsers = [],
  onSettingsClick,
  onCallClick,
  onVideoCallClick,
}: ChatHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  const onlineParticipants = chat.participants.filter(participant => 
    onlineUsers.includes(participant.userId)
  );

  const getOnlineCount = () => {
    return onlineParticipants.length;
  };

  const getParticipantNames = () => {
    // If this is an AI chat, show AI model info
    if (chat.title?.includes('AI Chat')) {
      return 'AI Assistant (GPT-4)';
    }

    const otherParticipants = chat.participants
      .filter(p => p.userId !== currentUser.id)
      .map(p => `${p.user.firstName} ${p.user.lastName}`)
      .slice(0, 2);
    
    if (otherParticipants.length === 0) {
      return 'You';
    } else if (otherParticipants.length === 1) {
      return otherParticipants[0];
    } else if (otherParticipants.length === 2) {
      return otherParticipants.join(' and ');
    } else {
      return `${otherParticipants[0]} and ${otherParticipants.length - 1} others`;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Chat avatar/icon */}
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
            {chat.isPublic ? '#' : '👥'}
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {chat.title}
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{getParticipantNames()}</span>
              {getOnlineCount() > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>{getOnlineCount()} online</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Action buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCallClick}
            className="h-8 w-8 p-0"
          >
            <Phone className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onVideoCallClick}
            className="h-8 w-8 p-0"
          >
            <Video className="h-4 w-4" />
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
              className="h-8 w-8 p-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onSettingsClick?.();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Chat Settings
                  </button>
                  <button
                    onClick={() => {
                      // Handle view participants
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Users className="h-4 w-4 mr-3" />
                    View Participants
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat description */}
      {chat.description && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">{chat.description}</p>
        </div>
      )}
    </div>
  );
}
