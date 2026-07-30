import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import { FiGrid, FiBox, FiShoppingBag, FiTag, FiUsers, FiLogOut, FiArrowLeft, FiTruck, FiClock, FiPercent, FiRotateCw, FiCalendar, FiSettings, FiBarChart2, FiBell, FiX, FiAlertTriangle, FiPackage, FiCheckCircle } from 'react-icons/fi';
import './Admin.css';

const PARTICLES = ['🍞', '🥐', '🥖', '🧁', '🎂', '🍰'];

const ALERT_ICONS = {
  warning: <FiAlertTriangle size={16} />,
  error: <FiPackage size={16} />,
  info: <FiShoppingBag size={16} />
};

const ALERT_COLORS = {
  warning: { bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  error: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', dot: '#ef4444' },
  info: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' }
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await adminAPI.getAlerts();
      setAlerts(res.data.data || []);
    } catch (err) {
      console.error('Error cargando alertas:', err);
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // Cargar alertas al montar y cada 60 segundos
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showNotif && !e.target.closest('.alert-bell-wrapper')) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotif]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAlertClick = (alert) => {
    navigate(alert.link);
    setShowNotif(false);
  };

  return (
    <div className="admin-layout">
      {/* Background Particles */}
      <div className="admin-bg-particles">
        {PARTICLES.map((emoji, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: `${10 + i * 15}%`,
              top: `${15 + (i % 3) * 25}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${10 + i * 2}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>🍞 PanEcuador</h2>
          <span>Panel de Administración</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiGrid /> Dashboard
          </NavLink>
          <NavLink to="/admin/reportes" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiBarChart2 /> Reportes BI
          </NavLink>
          <NavLink to="/admin/productos" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiBox /> Productos
          </NavLink>
          <NavLink to="/admin/pedidos" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiShoppingBag /> Pedidos
          </NavLink>
          <NavLink to="/admin/categorias" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiTag /> Categorías
          </NavLink>
          <NavLink to="/admin/productores" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiTruck /> Productores
          </NavLink>
          <NavLink to="/admin/trabajadores" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiClock /> Trabajadores
          </NavLink>
          <NavLink to="/admin/turnos" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiCalendar /> Turnos
          </NavLink>
          <NavLink to="/admin/cupones" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiPercent /> Cupones
          </NavLink>
          <NavLink to="/admin/precios" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiBarChart2 /> Precios y Ganancias
          </NavLink>
          <NavLink to="/admin/devoluciones" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiRotateCw /> Devoluciones
          </NavLink>
          <NavLink to="/admin/usuarios" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiUsers /> Usuarios
          </NavLink>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(196,127,59,0.15), transparent)', margin: '8px 0' }} />

          <NavLink to="/admin/configuracion" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiSettings /> Configurar Sitio
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <a href="/" className="admin-nav-link" target="_blank" rel="noopener noreferrer">
            <FiArrowLeft /> Ver tienda
          </a>
          <button onClick={handleLogout} className="admin-nav-link logout-link">
            <FiLogOut /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <h1 style={{ color: '#0f172a', fontWeight: 800 }}>Panel de Administración</h1>
          <div className="admin-topbar-right" style={{ gap: '16px' }}>

            {/* Live Alert Bell — Dynamic */}
            <div className="alert-bell-wrapper" style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotif(!showNotif); if (!showNotif) fetchAlerts(); }}
                style={{
                  background: alerts.length > 0 ? '#fffbeb' : '#f1f5f9',
                  border: `1px solid ${alerts.length > 0 ? '#fde68a' : '#cbd5e1'}`,
                  borderRadius: '10px',
                  padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px',
                  cursor: 'pointer', color: '#0f172a', fontWeight: 600, fontSize: '0.82rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <FiBell size={18} style={{ color: alerts.length > 0 ? '#d97706' : '#94a3b8' }} />
                <span>Alertas</span>
                {alerts.length > 0 && (
                  <span style={{
                    background: '#ef4444', color: '#fff', fontSize: '0.68rem',
                    padding: '2px 7px', borderRadius: '10px', fontWeight: 700,
                    minWidth: '18px', textAlign: 'center',
                    animation: 'pulse 2s infinite'
                  }}>
                    {alerts.length}
                  </span>
                )}
                {alerts.length === 0 && (
                  <FiCheckCircle size={14} style={{ color: '#22c55e' }} />
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotif && (
                <div style={{
                  position: 'absolute', top: '48px', right: 0, width: '360px',
                  background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)', zIndex: 1000, overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '14px 18px', background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                      <FiBell size={14} style={{ marginRight: '6px', color: '#d97706' }} />
                      Centro de Alertas
                    </strong>
                    <button
                      onClick={() => setShowNotif(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                    >
                      <FiX size={16} />
                    </button>
                  </div>

                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {alertsLoading ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                        Consultando estado operativo...
                      </div>
                    ) : alerts.length === 0 ? (
                      <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                        <FiCheckCircle size={28} style={{ color: '#22c55e', marginBottom: '8px' }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Todo en orden</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                          No hay alertas pendientes. Tu operación está al día.
                        </div>
                      </div>
                    ) : (
                      alerts.map((alert) => {
                        const colors = ALERT_COLORS[alert.tipo] || ALERT_COLORS.info;
                        return (
                          <div
                            key={alert.id}
                            onClick={() => handleAlertClick(alert)}
                            style={{
                              padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer', transition: 'background 0.15s',
                              display: 'flex', gap: '12px', alignItems: 'flex-start'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '8px',
                              background: colors.bg, border: `1px solid ${colors.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: colors.text, flexShrink: 0
                            }}>
                              {ALERT_ICONS[alert.tipo]}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: colors.text }}>
                                {alert.titulo}
                                <span style={{
                                  marginLeft: '6px', background: colors.bg, color: colors.text,
                                  padding: '1px 6px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800
                                }}>
                                  {alert.cantidad}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '2px', lineHeight: '1.3' }}>
                                {alert.mensaje}
                              </div>
                              {alert.detalle && (
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px', fontStyle: 'italic' }}>
                                  {alert.detalle}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {alerts.length > 0 && (
                    <div style={{
                      padding: '10px 16px', background: '#f8fafc',
                      borderTop: '1px solid #e2e8f0', textAlign: 'center'
                    }}>
                      <button
                        onClick={() => { navigate('/admin/productos'); setShowNotif(false); }}
                        style={{
                          background: 'none', border: 'none', color: '#d97706',
                          fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer'
                        }}
                      >
                        Ver todos los productos →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{user?.nombre} {user?.apellido}</span>
              <span className="admin-badge badge-admin">Admin</span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
