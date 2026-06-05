import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiCheckCircle, FiPackage, FiAlertCircle, FiStar, FiRefreshCw } from 'react-icons/fi';
import { notificationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Notifications.css';

const tipoConfig = {
  pedido: { icon: <FiPackage />, color: 'var(--color-primary)' },
  stock: { icon: <FiAlertCircle />, color: 'var(--color-warning)' },
  promocion: { icon: <FiStar />, color: 'var(--panpass-gold)' },
  sistema: { icon: <FiBell />, color: 'var(--color-info)' },
  devolucion: { icon: <FiRefreshCw />, color: 'var(--color-error)' }
};

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchNotifications();
  }, [isAuthenticated]);

  async function fetchNotifications() {
    try {
      const res = await notificationsAPI.getAll({ limit: 50 });
      setNotifications(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(notifications.map(n =>
        n.id_notificacion === id ? { ...n, leida: true } : n
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(notifications.map(n => ({ ...n, leida: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.leida).length;

  const formatDate = (d) => {
    const date = new Date(d);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="notif-page">
        <div className="container">
          <div className="loading-screen"><div className="spinner" /><p>Cargando notificaciones...</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="notif-page">
      <div className="container">
        <div className="notif-header">
          <div>
            <h1><FiBell /> Notificaciones</h1>
            {unreadCount > 0 && (
              <span className="notif-unread-count">{unreadCount} sin leer</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>
              <FiCheckCircle /> Marcar todas como leídas
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">🔔</span>
            <h3>No tienes notificaciones</h3>
            <p>Aquí aparecerán las actualizaciones de tus pedidos y promociones</p>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map(n => {
              const config = tipoConfig[n.tipo] || tipoConfig.sistema;
              return (
                <div key={n.id_notificacion}
                  className={`notif-item ${n.leida ? 'read' : 'unread'}`}
                  onClick={() => !n.leida && handleMarkRead(n.id_notificacion)}>

                  <div className="notif-icon" style={{ color: config.color, background: config.color + '15' }}>
                    {config.icon}
                  </div>

                  <div className="notif-content">
                    <strong className="notif-title">{n.titulo}</strong>
                    <p className="notif-message">{n.mensaje}</p>
                    <span className="notif-time">{formatDate(n.fecha)}</span>
                  </div>

                  {!n.leida && (
                    <div className="notif-unread-dot" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
