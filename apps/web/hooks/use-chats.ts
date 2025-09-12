import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Chat, CreateChatRequest } from '@t3-chat/types';
import { apiClient } from '@/lib/api-client';

interface ChatResponse {
  data: Chat[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export function useChats(): ReturnType<typeof useQuery<Chat[]>> {
  return useQuery({
    queryKey: ['chats'],
    queryFn: async (): Promise<Chat[]> => {
      const response = await apiClient.get<ChatResponse>('/chats/my');
      return response.data || [];
    },
  });
}

export function useChat(chatId: string) {
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => apiClient.get<Chat>(`/chats/${chatId}`),
    enabled: !!chatId,
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChatRequest) => 
      apiClient.post<Chat>('/chats', data),
    onSuccess: (newChat) => {
      queryClient.setQueryData(['chats'], (old: Chat[] | undefined) => 
        old ? [newChat, ...old] : [newChat]
      );
    },
  });
}

export function useUpdateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, data }: { chatId: string; data: Partial<CreateChatRequest> }) =>
      apiClient.patch<Chat>(`/chats/${chatId}`, data),
    onSuccess: (updatedChat) => {
      queryClient.setQueryData(['chat', updatedChat.id], updatedChat);
      queryClient.setQueryData(['chats'], (old: Chat[] | undefined) =>
        old?.map(chat => chat.id === updatedChat.id ? updatedChat : chat)
      );
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => apiClient.delete(`/chats/${chatId}`),
    onSuccess: (_, chatId) => {
      queryClient.setQueryData(['chats'], (old: Chat[] | undefined) =>
        old?.filter(chat => chat.id !== chatId)
      );
      queryClient.removeQueries({ queryKey: ['chat', chatId] });
    },
  });
}
