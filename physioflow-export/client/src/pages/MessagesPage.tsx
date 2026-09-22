import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Send, MessageCircle, AlertCircle } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { useMyConversation, useConversations, useConversationMessages, useSendMessage } from "../features/messages/hooks";
import type { MessageEntry } from "../features/messages/hooks";
import { useAuthStore } from "../lib/authStore";
import clsx from "clsx";

const EMERGENCY_NOTICE =
  "For emergencies, contact your local emergency service. This chat is not monitored as an emergency service.";

function MessageBubble({ message, isMine }: { message: MessageEntry; isMine: boolean }) {
  return (
    <div className={clsx("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          isMine ? "rounded-br-sm bg-brand-800 text-white" : "rounded-bl-sm bg-surface-sunken text-ink-900"
        )}
      >
        <p>{message.body}</p>
        <p className={clsx("mt-1 text-[11px]", isMine ? "text-brand-200" : "text-ink-400")}>
          {format(new Date(message.createdAt), "h:mm a")}
        </p>
      </div>
    </div>
  );
}

function Thread({ conversationId, messages, userId }: { conversationId: string; messages: MessageEntry[]; userId: string | null }) {
  const [draft, setDraft] = useState("");
  const send = useSendMessage(conversationId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    send.mutate(draft.trim());
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-ink-500">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} isMine={m.senderId === userId} />)
        )}
      </div>
      <div className="flex items-start gap-2 border-t border-border bg-attention-50 px-4 py-2 text-xs text-attention-700">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        {EMERGENCY_NOTICE}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-border-strong bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        <Button type="submit" size="sm" isLoading={send.isPending} disabled={!draft.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

function PatientMessagesView() {
  const { userId } = useAuthStore();
  const { data, isLoading, isError, refetch } = useMyConversation();

  if (isLoading) return <Card className="h-[70vh] animate-pulse" />;
  if (isError || !data) return <ErrorState message="We couldn't load your messages." onRetry={() => refetch()} />;

  return (
    <Card className="h-[70vh] overflow-hidden">
      <Thread conversationId={data.conversationId} messages={data.messages} userId={userId} />
    </Card>
  );
}

function PhysioMessagesView() {
  const { userId } = useAuthStore();
  const { data: conversations, isLoading, isError, refetch } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: messages } = useConversationMessages(activeId);

  if (isLoading) return <Card className="h-[70vh] animate-pulse" />;
  if (isError) return <ErrorState message="We couldn't load conversations." onRetry={() => refetch()} />;
  if (!conversations || conversations.length === 0) {
    return <EmptyState icon={<MessageCircle className="size-6" />} title="No conversations yet" description="Patient messages will appear here." />;
  }

  const active = activeId ?? conversations[0].id;
  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [activeId, conversations]);

  return (
    <Card className="grid h-[70vh] grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr]">
      <div className="hidden overflow-y-auto border-r border-border md:block">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={clsx(
              "flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-left hover:bg-surface-sunken",
              active === c.id && "bg-brand-50"
            )}
          >
            <span className="text-sm font-medium text-ink-900">{c.patientName}</span>
            <span className="line-clamp-1 text-xs text-ink-500">{c.lastMessage?.body ?? "No messages yet"}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0">
        <Thread conversationId={active} messages={messages ?? []} userId={userId} />
      </div>
    </Card>
  );
}

export function MessagesPage() {
  const { role } = useAuthStore();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Messages</h1>
        <p className="mt-1 text-ink-500">
          {role === "PATIENT" ? "Chat with your care team." : "Conversations with your patients."}
        </p>
      </div>
      {role === "PATIENT" ? <PatientMessagesView /> : <PhysioMessagesView />}
    </div>
  );
}
