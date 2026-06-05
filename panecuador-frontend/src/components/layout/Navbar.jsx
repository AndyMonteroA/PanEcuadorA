import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { FiShoppingCart, FiUser, FiSearch, FiMenu, FiX, FiBell, FiHeart, FiPackage, FiLogOut } from 'react-icons/fi';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/catalogo?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🍞</span>
          <div className="logo-text">
            <span className="logo-name">PanEcuador</span>
            <span className="logo-tagline">Panadería artesanal</span>
          </div>
        </Link>

        {/* Barra de búsqueda */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar panes, pasteles, postres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">Buscar</button>
        </form>

        {/* Acciones */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              <Link to="/notificaciones" className="nav-action" title="Notificaciones">
                <FiBell size={22} />
              </Link>

              <Link to="/favoritos" className="nav-action" title="Favoritos">
                <FiHeart size={22} />
              </Link>

              <Link to="/carrito" className="nav-action cart-action" title="Carrito">
                <FiShoppingCart size={22} />
                {itemCount > 0 && (
                  <span className="cart-badge">{itemCount > 99 ? '99+' : itemCount}</span>
                )}
              </Link>

              <div className="user-menu-wrapper">
                <button
                  className="nav-action user-action"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <FiUser size={22} />
                  <span className="user-name">{user?.nombre}</span>
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown" onClick={() => setUserMenuOpen(false)}>
                    <div className="dropdown-header">
                      <strong>{user?.nombre} {user?.apellido}</strong>
                      <span>{user?.email}</span>
                    </div>
                    <div className="dropdown-divider" />
                    <Link to="/perfil" className="dropdown-item">
                      <FiUser size={16} /> Mi Perfil
                    </Link>
                    <Link to="/pedidos" className="dropdown-item">
                      <FiPackage size={16} /> Mis Pedidos
                    </Link>
                    <Link to="/panpass" className="dropdown-item dropdown-panpass">
                      ⭐ PanPass
                    </Link>
                    <div className="dropdown-divider" />
                    <button onClick={handleLogout} className="dropdown-item dropdown-logout">
                      <FiLogOut size={16} /> Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-secondary btn-sm">Ingresar</Link>
              <Link to="/registro" className="btn btn-primary btn-sm">Registrarse</Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Barra inferior con categorías */}
      <div className="navbar-categories">
        <div className="navbar-container categories-scroll">
          <Link to="/catalogo" className="category-link">Todos</Link>
          <Link to="/catalogo?categoria=1" className="category-link">🥖 Panes</Link>
          <Link to="/catalogo?categoria=2" className="category-link">🎂 Pasteles</Link>
          <Link to="/catalogo?categoria=3" className="category-link">🥮 Bocaditos</Link>
          <Link to="/catalogo?categoria=4" className="category-link">🍰 Postres</Link>
          <Link to="/catalogo?categoria=5" className="category-link">🌾 Sin Gluten</Link>
          <Link to="/catalogo?categoria=6" className="category-link">🎄 Temporada</Link>
          <Link to="/panpass" className="category-link panpass-link">⭐ PanPass</Link>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <form className="mobile-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          <Link to="/catalogo" className="mobile-link">Catálogo</Link>
          <Link to="/panpass" className="mobile-link">PanPass</Link>
          {isAuthenticated ? (
            <>
              <Link to="/pedidos" className="mobile-link">Mis Pedidos</Link>
              <Link to="/perfil" className="mobile-link">Mi Perfil</Link>
              <Link to="/carrito" className="mobile-link">Carrito ({itemCount})</Link>
              <button onClick={handleLogout} className="mobile-link mobile-logout">Cerrar Sesión</button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-link">Ingresar</Link>
              <Link to="/registro" className="mobile-link">Registrarse</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
