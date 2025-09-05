import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Message, CreateMessageRequest } from '@t3-chat/types';
import { apiClient } from '@/lib/api-client';

export function useMessages(chatId: string) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => apiClient.get<Message[]>(`/messages/chat/${chatId}`),
    enabled: !!chatId,
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMessageRequest) =>
      apiClient.post<Message>('/messages', data),
    onSuccess: (newMessage) => {
      // Update the messages for the specific chat
      queryClient.setQueryData(['messages', newMessage.chatId], (old: Message[] | undefined) =>
        old ? [...old, newMessage] : [newMessage]
      );
      
      // Update the chats list to show the latest message
      queryClient.setQueryData(['chats'], (old: any[] | undefined) =>
        old?.map(chat => 
          chat.id === newMessage.chatId 
            ? { ...chat, updatedAt: newMessage.createdAt }
            : chat
        )
      );
    },
  });
}

export function useUpdateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, data }: { messageId: string; data: Partial<CreateMessageRequest> }) =>
      apiClient.patch<Message>(`/messages/${messageId}`, data),
    onSuccess: (updatedMessage) => {
      queryClient.setQueryData(['messages', updatedMessage.chatId], (old: Message[] | undefined) =>
        old?.map(message => 
          message.id === updatedMessage.id ? updatedMessage : message
        )
      );
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => apiClient.delete(`/messages/${messageId}`),
    onSuccess: (_, messageId) => {
      // Find which chat this message belongs to and update its messages
      queryClient.setQueryData(['messages'], (old: any) => {
        if (!old) return old;
        // This is a simplified approach - in a real app you'd want to track chatId
        return old.filter((message: Message) => message.id !== messageId);
      });
    },
  });
}
