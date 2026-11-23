import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState('');

  useEffect(() => {
    let active = true;
    if (!user?.id || !isSupabaseConfigured) {
      setNotifications([]);
      setNotificationError('');
      return () => { active = false; };
    }

    supabase
      .from('notifications')
      .select('id,type,title,message,link,read,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(25)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setNotifications([]);
          setNotificationError(`Unable to load notifications: ${error.message}`);
          return;
        }
        setNotifications((data || []).map((item) => ({
          ...item,
          createdAt: item.created_at,
        })));
        setNotificationError('');
      })
      .catch((error) => {
        if (!active) return;
        setNotifications([]);
        setNotificationError(`Unable to load notifications: ${error.message}`);
      });

    return () => { active = false; };
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id) => {
    if (!user?.id || !isSupabaseConfigured) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      setNotificationError(`Unable to update notification: ${error.message}`);
      return;
    }
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, read: true } : item));
    setNotificationError('');
  };

  const markAllAsRead = async () => {
    if (!user?.id || !isSupabaseConfigured) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (error) {
      setNotificationError(`Unable to update notifications: ${error.message}`);
      return;
    }
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setNotificationError('');
  };

  const addNotification = async ({ title, message, type = 'info', link = null }) => {
    if (!user?.id || !isSupabaseConfigured) {
      throw new Error('A configured authenticated account is required to create notifications.');
    }
    const { data, error } = await supabase
      .from('notifications')
      .insert({ user_id: user.id, title, message, type, link, read: false })
      .select('id,type,title,message,link,read,created_at')
      .single();
    if (error) {
      setNotificationError(`Unable to create notification: ${error.message}`);
      throw error;
    }
    setNotifications((prev) => [{ ...data, createdAt: data.created_at }, ...prev].slice(0, 25));
    setNotificationError('');
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        notificationError,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
