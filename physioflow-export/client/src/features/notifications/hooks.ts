import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface NotificationEntry {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

async function fetchMyNotifications() {
  const res = await api.get<NotificationEntry[]>("/notifications/me");
  return res.data;
}

export function useMyNotifications() {
  return useQuery({ queryKey: ["notifications", "me"], queryFn: fetchMyNotifications, refetchInterval: 30_000 });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/notifications/${id}/read`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", "me"] }),
  });
}

async function fetchUnreadMessageCount() {
  const res = await api.get<{ count: number }>("/messages/unread-count");
  return res.data.count;
}

export function useUnreadMessageCount() {
  return useQuery({ queryKey: ["messages", "unread-count"], queryFn: fetchUnreadMessageCount, refetchInterval: 20_000 });
}
