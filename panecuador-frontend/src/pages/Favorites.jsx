import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import { reviewsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Favorites.css';

export default function Favorites() {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchFavorites();
  }, [isAuthenticated]);

  async function fetchFavorites() {
    try {
      const res = await reviewsAPI.getFavorites();
      setFavorites(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleRemove = async (productId) => {
    try {
      await reviewsAPI.toggleFavorite(productId);
      setFavorites(favorites.filter(f => f.id_producto !== productId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = async (productId) => {
    try {
      await addToCart(productId);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="favorites-page">
        <div className="container">
          <div className="loading-screen"><div className="spinner" /><p>Cargando favoritos...</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <div className="container">
        <h1 className="favorites-title"><FiHeart /> Mis Favoritos</h1>

        {favorites.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">❤️</span>
            <h3>No tienes favoritos</h3>
            <p>Explora nuestro catálogo y marca tus productos preferidos</p>
            <Link to="/catalogo" className="btn btn-primary">Ir al catálogo</Link>
          </div>
        ) : (
          <div className="favorites-grid">
            {favorites.map(fav => (
              <div key={fav.id_producto} className="favorite-card card">
                <Link to={`/producto/${fav.id_producto}`} className="fav-image">
                  {fav.imagen_principal ? (
                    <img src={fav.imagen_principal} alt={fav.nombre} />
                  ) : (
                    <div className="product-placeholder" style={{ height: '100%' }}>
                      🍞
                    </div>
                  )}
                </Link>

                <div className="fav-info">
                  <Link to={`/producto/${fav.id_producto}`}>
                    <span className="fav-category">{fav.categoria_nombre}</span>
                    <h3 className="fav-name">{fav.nombre}</h3>
                  </Link>
                  <span className="fav-price">${parseFloat(fav.precio).toFixed(2)}</span>

                  <div className="fav-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => handleAddToCart(fav.id_producto)}>
                      <FiShoppingCart size={14} /> Agregar
                    </button>
                    <button className="btn-icon-sm fav-remove" onClick={() => handleRemove(fav.id_producto)}>
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
