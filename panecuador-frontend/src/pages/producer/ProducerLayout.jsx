import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiGrid, FiBox, FiShoppingBag, FiUsers, FiLogOut, FiArrowLeft, FiClock } from 'react-icons/fi';
import '../admin/Admin.css';

const PARTICLES = ['🥐', '🍞', '🧁', '🥖'];

export default function ProducerLayout() {
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
              left: `${15 + i * 20}%`,
              top: `${20 + (i % 2) * 30}%`,
              animationDelay: `${i * 3}s`,
              animationDuration: `${12 + i * 2}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>🏪 Mi Negocio</h2>
          <span>Panel de Productor</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/productor" end className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiGrid /> Dashboard
          </NavLink>
          <NavLink to="/productor/productos" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiBox /> Mis Productos
          </NavLink>
          <NavLink to="/productor/pedidos" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiShoppingBag /> Mis Pedidos
          </NavLink>
          <NavLink to="/productor/trabajadores" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiUsers /> Mi Personal
          </NavLink>
          <NavLink to="/productor/turnos" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiClock /> Turnos Rotativos
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
          <h1>Panel de Productor</h1>
          <div className="admin-topbar-right">
            <span>{user?.nombre} {user?.apellido}</span>
            <span className="admin-badge" style={{background:'rgba(196,127,59,0.15)',color:'#C47F3B'}}>Productor</span>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
