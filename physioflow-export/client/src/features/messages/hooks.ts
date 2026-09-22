import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface MessageEntry {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender: { fullName: string; role: string };
}

export interface ConversationSummary {
  id: string;
  patientId: string;
  patientName: string;
  patientAvatarUrl: string | null;
  lastMessage: MessageEntry | null;
}

async function fetchMyConversation() {
  const res = await api.get<{ conversationId: string; messages: MessageEntry[] }>("/messages/me");
  return res.data;
}

export function useMyConversation() {
  return useQuery({ queryKey: ["messages", "me"], queryFn: fetchMyConversation, refetchInterval: 10_000 });
}

async function fetchConversations() {
  const res = await api.get<ConversationSummary[]>("/messages");
  return res.data;
}

export function useConversations() {
  return useQuery({ queryKey: ["messages", "conversations"], queryFn: fetchConversations, refetchInterval: 15_000 });
}

async function fetchMessages(conversationId: string) {
  const res = await api.get<MessageEntry[]>(`/messages/${conversationId}`);
  return res.data;
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId as string),
    enabled: !!conversationId,
    refetchInterval: 8_000,
  });
}

export function useSendMessage(conversationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post<MessageEntry>(`/messages/${conversationId}`, { body });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}
