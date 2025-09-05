'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chat, User } from '@t3-chat/types';
import { useUpdateChat, useDeleteChat } from '@/hooks/use-chats';
import { Trash2, Users, Lock, Globe } from 'lucide-react';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  currentUser: User;
}

export function ChatSettingsModal({
  isOpen,
  onClose,
  chat,
  currentUser,
}: ChatSettingsModalProps) {
  const [title, setTitle] = useState(chat.title);
  const [description, setDescription] = useState(chat.description || '');
  const [isPublic, setIsPublic] = useState(chat.isPublic);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateChatMutation = useUpdateChat();
  const deleteChatMutation = useDeleteChat();

  const isOwner = chat.participants.find(p => p.userId === currentUser.id)?.role === 'OWNER';

  const handleSave = async () => {
    try {
      await updateChatMutation.mutateAsync({
        chatId: chat.id,
        data: {
          title,
          description,
          isPublic,
        },
      });
      onClose();
    } catch (error) {
      console.error('Error updating chat:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteChatMutation.mutateAsync(chat.id);
      onClose();
    } catch (error) {
      console.error('Error deleting chat:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chat Settings"
      className="max-w-lg"
    >
      <div className="space-y-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>
              Update the chat name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Chat Name
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter chat name"
                disabled={!isOwner}
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter chat description"
                disabled={!isOwner}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Privacy</CardTitle>
            <CardDescription>
              Control who can access this chat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="privacy"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  disabled={!isOwner}
                  className="h-4 w-4 text-blue-600"
                />
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Private</p>
                    <p className="text-xs text-gray-500">Only invited participants can join</p>
                  </div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="privacy"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  disabled={!isOwner}
                  className="h-4 w-4 text-blue-600"
                />
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Public</p>
                    <p className="text-xs text-gray-500">Anyone can discover and join</p>
                  </div>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Participants</CardTitle>
            <CardDescription>
              {chat.participants.length} members in this chat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {chat.participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      {participant.user.avatar ? (
                        <img
                          src={participant.user.avatar}
                          alt={participant.user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-gray-600">
                          {participant.user.firstName.charAt(0)}{participant.user.lastName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {participant.user.firstName} {participant.user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">@{participant.user.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {participant.role}
                    </span>
                    {participant.userId === currentUser.id && (
                      <span className="text-xs text-blue-600">(You)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between">
          <div>
            {isOwner && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Chat'}</span>
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {isOwner && (
              <Button
                onClick={handleSave}
                disabled={updateChatMutation.isPending}
              >
                {updateChatMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
