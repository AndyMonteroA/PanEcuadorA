import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiGrid, FiBox, FiShoppingBag, FiTag, FiUsers, FiLogOut, FiArrowLeft, FiTruck, FiClock, FiPercent } from 'react-icons/fi';
import './Admin.css';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>🍞 PanEcuador</h2>
          <span>Panel de Administración</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiGrid /> Dashboard
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
          <NavLink to="/admin/cupones" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiPercent /> Cupones
          </NavLink>
          <NavLink to="/admin/usuarios" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <FiUsers /> Usuarios
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
          <h1>Panel de Administración</h1>
          <div className="admin-topbar-right">
            <span>{user?.nombre} {user?.apellido}</span>
            <span className="admin-badge badge-admin">Admin</span>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
