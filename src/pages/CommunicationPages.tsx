import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, CheckCheck, MessageSquare, Send } from 'lucide-react';
import { WorkspaceShell } from '../components/Layout';
import { apiFetch, formatDateShort } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { AppNotification, Conversation, Message } from '../types';

export function MessagesPage() {
  const { user, notify } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(searchParams.get('c'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiFetch<{ conversations: Conversation[] }>('/api/messaging/conversations');
      setConversations(res.conversations);
      if (!activeId && res.conversations[0]) {
        setActiveId(res.conversations[0].id);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingConvs(false);
    }
  }, [activeId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await apiFetch<{ messages: Message[] }>(`/api/messaging/conversations/${convId}/messages`);
      setMessages(res.messages);
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to load messages.', 'error');
    }
  }, [notify]);

  useEffect(() => {
    if (activeId) {
      loadMessages(activeId);
    }
  }, [activeId, loadMessages]);

  // Listen to SSE real-time messages
  useEffect(() => {
    if (!user) return;
    const es = new EventSource('/api/messaging/stream');
    es.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse((ev as MessageEvent).data) as Message;
        if (msg.conversation_id === activeId) {
          setMessages((prev) => [...prev, msg]);
        }
        loadConversations();
      } catch {
        // Ignore
      }
    });
    return () => {
      es.close();
    };
  }, [user, activeId, loadConversations]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !body.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/api/messaging/conversations/${activeId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      setBody('');
      await loadMessages(activeId);
      await loadConversations();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <WorkspaceShell title="Messages" subtitle="Direct conversations between students and authorised property hosts.">
      <div className="bg-white rounded-2xl border border-[#c1c8c2] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
        {/* Conversations List */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-[#c1c8c2] flex flex-col">
          <div className="p-4 border-b border-[#c1c8c2]/60 font-bold text-sm text-[#002517]">Conversations</div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#c1c8c2]/50">
            {loadingConvs ? (
              <p className="p-4 text-sm text-[#414844]">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <MessageSquare className="w-7 h-7 text-[#296a46] mx-auto opacity-70" />
                <p className="text-sm font-semibold text-[#002517]">No messages yet</p>
                <p className="text-xs text-[#414844]">Start a conversation from any property listing page.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const others = conv.participants.filter((p) => p.user_id !== user?.id);
                const otherName = others.map((o) => o.full_name).join(', ') || 'Conversation';
                const selected = conv.id === activeId;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setActiveId(conv.id);
                      setSearchParams({ c: conv.id });
                    }}
                    className={`w-full text-left p-4 transition-colors ${
                      selected ? 'bg-[#effdf1]' : 'hover:bg-[#effdf1]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#002517] truncate">{otherName}</span>
                      {conv.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#296a46] text-white text-[11px] font-bold tabular-nums">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    {conv.property_title && (
                      <p className="text-xs font-medium text-[#296a46] truncate mt-0.5">{conv.property_title}</p>
                    )}
                    <p className="text-xs text-[#414844] truncate mt-1">{conv.last_message || 'No messages yet'}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="md:col-span-8 flex flex-col">
          {activeConv ? (
            <>
              <div className="p-4 border-b border-[#c1c8c2]/60 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-[#002517]">
                    {activeConv.participants
                      .filter((p) => p.user_id !== user?.id)
                      .map((p) => `${p.full_name} (${p.role})`)
                      .join(', ')}
                  </h2>
                  {activeConv.property_title && (
                    <p className="text-xs text-[#296a46]">{activeConv.property_title}</p>
                  )}
                </div>
                {activeConv.property_id && (
                  <Link
                    to={`/properties/${activeConv.property_id}`}
                    className="text-xs font-semibold text-[#002517] underline"
                  >
                    View Property
                  </Link>
                )}
              </div>

              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px] bg-[#effdf1]/30">
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine
                            ? 'bg-[#002517] text-[#effdf1]'
                            : 'bg-white border border-[#c1c8c2] text-[#121e17]'
                        }`}
                      >
                        <p>{m.body}</p>
                      </div>
                      <span className="text-[11px] text-[#414844] mt-1 px-1">
                        {m.sender_name} · {formatDateShort(m.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSend} className="p-4 border-t border-[#c1c8c2]/60 flex gap-2 bg-white">
                <input
                  type="text"
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 rounded-xl border border-[#c1c8c2] px-4 py-2.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2.5 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-[#414844]">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}

export function NotificationsPage() {
  const { refreshNotifications, notify } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ notifications: AppNotification[] }>('/api/messaging/notifications');
      setNotifications(res.notifications);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    await apiFetch(`/api/messaging/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    refreshNotifications();
  };

  const markAllRead = async () => {
    await apiFetch('/api/messaging/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    refreshNotifications();
    notify('All notifications marked as read.', 'info');
  };

  return (
    <WorkspaceShell
      title="Notifications"
      subtitle="Platform updates on enquiries, viewings, applications, and listings."
      action={
        <button
          type="button"
          onClick={markAllRead}
          className="px-3.5 py-2 rounded-lg border border-[#c1c8c2] bg-white text-xs font-semibold text-[#002517] inline-flex items-center gap-1.5 hover:bg-[#effdf1]"
        >
          <CheckCheck className="w-4 h-4 text-[#296a46]" />
          <span>Mark all as read</span>
        </button>
      }
    >
      {loading ? (
        <p className="text-sm text-[#414844]">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] p-12 text-center space-y-2">
          <Bell className="w-8 h-8 text-[#296a46] mx-auto opacity-75" />
          <h2 className="text-lg font-bold text-[#002517]">You are all caught up</h2>
          <p className="text-sm text-[#414844]">New enquiry replies and viewing updates will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#c1c8c2] divide-y divide-[#c1c8c2]/60">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                n.is_read ? 'bg-white' : 'bg-[#effdf1]/60'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#002517]">{n.title}</h3>
                  {!n.is_read && <span className="text-[11px] font-bold text-[#296a46]">· Unread</span>}
                </div>
                <p className="text-sm text-[#414844]">{n.body}</p>
                <p className="text-xs text-[#414844]">{formatDateShort(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {n.link && (
                  <Link to={n.link} className="text-xs font-bold text-[#296a46] hover:underline">
                    Open
                  </Link>
                )}
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="text-xs font-semibold text-[#002517] border border-[#c1c8c2] px-3 py-1.5 rounded-lg bg-white"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
