import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiGrid, FiLogOut, FiArrowLeft, FiClock, FiShoppingBag } from 'react-icons/fi';
import '../admin/Admin.css';

const PARTICLES = ['🍳', '🥖', '🍞'];

export default function WorkerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="admin-layout">
      {/* Background Particles */}
      <div className="admin-bg-particles">
        {PARTICLES.map((emoji, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: `${20 + i * 25}%`,
              top: `${25 + (i % 2) * 30}%`,
              animationDelay: `${i * 4}s`,
              animationDuration: `${14 + i * 2}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>🍳 Operaciones</h2>
          <span>Portal de Cocina</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/trabajador" end className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiGrid /> Dashboard
          </NavLink>
          <NavLink to="/trabajador/tareas" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiShoppingBag /> Cola de Cocina
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <a href="/" className="admin-nav-link" target="_blank" rel="noopener noreferrer">
            <FiArrowLeft /> Ver tienda
          </a>
          <button onClick={() => { logout(); navigate('/login'); }} className="admin-nav-link logout-link">
            <FiLogOut /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <h1>Cocina & Horno PanEcuador</h1>
          <div className="admin-topbar-right">
            <span>{user?.nombre} {user?.apellido}</span>
            <span className="admin-badge" style={{background:'rgba(96,165,250,0.12)',color:'#60a5fa'}}>Operario</span>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
