import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { notificationsAPI } from '../services/api';
import './NotificationContext.css';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const prevIdsRef = useRef(new Set());
  const firstLoadRef = useRef(true);

  const addToast = (message, tipo = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, message, tipo }]);
    
    // Auto-remove after 5.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('panecuador_token');
      if (!token) return;
      
      const res = await notificationsAPI.getAll();
      const list = res.data.data || [];
      const unread = res.data.noLeidas || 0;

      setNotifications(list);
      setUnreadCount(unread);

      const newUnread = [];
      list.forEach(n => {
        if (!n.leida && !prevIdsRef.current.has(n.id_notificacion)) {
          newUnread.push(n);
        }
        prevIdsRef.current.add(n.id_notificacion);
      });

      if (!firstLoadRef.current && newUnread.length > 0) {
        newUnread.forEach(n => {
          addToast(n.mensaje, n.tipo || 'info');
        });
      }

      firstLoadRef.current = false;
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id_notificacion === id ? { ...n, leida: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('panecuador_token');
    if (!token || !isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      prevIdsRef.current = new Set();
      firstLoadRef.current = true;
      return;
    }

    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000); // Polling every 10 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const value = {
    notifications,
    unreadCount,
    toasts,
    addToast,
    removeToast,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Toast container floating layout */}
      <div className="toast-container">
        {toasts.map(toast => {
          let emoji = '🔔';
          if (toast.message.includes('horneado') || toast.message.includes('cocina') || toast.message.includes('listos')) emoji = '🥖';
          else if (toast.message.includes('camino') || toast.message.includes('entrega') || toast.message.includes('envío')) emoji = '🚚';
          else if (toast.message.includes('creado') || toast.message.includes('recibido') || toast.message.includes('pedido')) emoji = '📦';
          else if (toast.message.includes('devolución') || toast.message.includes('reembolso')) emoji = '🔁';

          return (
            <div key={toast.id} className={`toast-alert toast-${toast.tipo}`}>
              <span className="toast-emoji">{emoji}</span>
              <div className="toast-body">
                <span className="toast-title">Alerta de PanEcuador</span>
                <p className="toast-text">{toast.message}</p>
              </div>
              <button className="toast-close" onClick={() => removeToast(toast.id)}>×</button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de un NotificationProvider');
  }
  return context;
}
