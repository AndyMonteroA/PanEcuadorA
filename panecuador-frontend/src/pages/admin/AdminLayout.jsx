import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiGrid, FiBox, FiShoppingBag, FiTag, FiUsers, FiLogOut, FiArrowLeft, FiTruck, FiClock, FiPercent, FiRotateCw, FiCalendar, FiSettings, FiBarChart2, FiBell } from 'react-icons/fi';
import './Admin.css';

const PARTICLES = ['🍞', '🥐', '🥖', '🧁', '🎂', '🍰'];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
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
          <div className="admin-topbar-right" style={{ gap: '20px' }}>
            {/* Live Alert Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotif(!showNotif)}
                style={{
                  background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px',
                  padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px',
                  cursor: 'pointer', color: '#0f172a', fontWeight: 600, fontSize: '0.82rem'
                }}
              >
                <FiBell size={18} style={{ color: '#d97706' }} />
                <span>Alertas</span>
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>3</span>
              </button>

              {/* Notification Dropdown */}
              {showNotif && (
                <div style={{
                  position: 'absolute', top: '48px', right: 0, width: '340px',
                  background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden'
                }}>
                  <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>🔔 Centro de Alertas Operativas</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>En vivo</span>
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <div
                      onClick={() => { navigate('/admin/precios'); setShowNotif(false); }}
                      style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309' }}>🥖 Horneado / Stock Bajo</div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>Hay productos sin stock fresco. Los pedidos se toman como "Bajo pedido".</div>
                    </div>
                    <div
                      onClick={() => { navigate('/admin/devoluciones'); setShowNotif(false); }}
                      style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626' }}>📦 Solicitud de Devolución</div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>Nueva evidencia de devolución cargada por cliente.</div>
                    </div>
                    <div
                      onClick={() => { navigate('/admin/pedidos'); setShowNotif(false); }}
                      style={{ padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}>🚚 Despachos del Día</div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>Verifica los pedidos programados para la franja 09:00 - 12:00.</div>
                    </div>
                  </div>
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
