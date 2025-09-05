'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { FileUpload } from './file-upload';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import { cn } from '@t3-chat/utils';

interface MessageInputProps {
  onSendMessage: (content: string, type: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTyping(true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      onTyping(false);
    }

    // Reset typing indicator after 3 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTyping(false);
      }
    }, 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() && attachments.length === 0) return;

    // Send text message if there's content
    if (message.trim()) {
      onSendMessage(message.trim(), 'TEXT');
      setMessage('');
    }

    // Send file attachments
    attachments.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const type = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
        onSendMessage(content, type);
      };
      reader.readAsDataURL(file);
    });

    setAttachments([]);
    setIsTyping(false);
    onTyping(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const handleFilesSelected = (files: File[]) => {
    setAttachments(files);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        onTyping(false);
      }
    };
  }, [isTyping, onTyping]);

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* File attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2"
            >
              <span className="text-sm text-gray-700 truncate max-w-32">
                {file.name}
              </span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-12"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setShowFileUpload(true)}
              className="text-gray-400 hover:text-gray-600 p-1"
              disabled={disabled}
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 p-1"
              disabled={disabled}
            >
              <Smile className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className="h-10 w-10 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />

      {/* File upload modal */}
      <Modal
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        title="Upload Files"
        className="max-w-2xl"
      >
        <FileUpload
          onFilesSelected={handleFilesSelected}
          maxFiles={5}
          maxSize={10 * 1024 * 1024} // 10MB
          acceptedTypes={['image/*', '.pdf', '.doc', '.docx', '.txt']}
        />
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={() => setShowFileUpload(false)}>
            Cancel
          </Button>
          <Button onClick={() => setShowFileUpload(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}
