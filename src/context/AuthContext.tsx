import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { AuthUser } from '../types';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  unreadNotifications: number;
  refreshUser: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  logout: () => Promise<void>;
  notify: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await apiFetch<{ unreadCount: number }>('/api/messaging/notifications');
      setUnreadNotifications(res.unreadCount);
    } catch {
      setUnreadNotifications(0);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: AuthUser | null }>('/api/auth/me');
      setUser(data.user);
      if (data.user) {
        await refreshNotifications();
      } else {
        setUnreadNotifications(0);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Real-time SSE stream for authenticated users
  useEffect(() => {
    if (!user) return;
    const es = new EventSource('/api/messaging/stream');
    es.addEventListener('notification', (ev) => {
      try {
        const payload = JSON.parse((ev as MessageEvent).data);
        setUnreadNotifications((n) => n + 1);
        notify(payload.title || 'New notification', 'info');
      } catch {
        // Ignore malformed SSE frame
      }
    });
    return () => {
      es.close();
    };
  }, [user, notify]);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setUnreadNotifications(0);
    notify('You have been signed out.', 'info');
  }, [notify]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        unreadNotifications,
        refreshUser,
        refreshNotifications,
        logout,
        notify,
      }}
    >
      {children}

      {/* Accessible live toast stack */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all ${
              t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : t.type === 'success'
                ? 'bg-[#002517] border-[#296a46] text-[#effdf1]'
                : 'bg-white border-[#c1c8c2] text-[#121e17]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span>{t.text}</span>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-xs opacity-70 hover:opacity-100 shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
