import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiGrid, FiLogOut, FiArrowLeft, FiClock, FiShoppingBag } from 'react-icons/fi';
import '../admin/Admin.css';

export default function WorkerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" style={{background:'linear-gradient(180deg, #121824 0%, #0a0d16 100%)'}}>
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
            <span className="admin-badge" style={{background:'#3b82f6',color:'#fff'}}>Operario</span>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
