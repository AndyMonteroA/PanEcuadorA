import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingCart, FiHeart, FiClock, FiStar } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { reviewsAPI } from '../../services/api';
import './ProductCard.css';

export default function ProductCard({ product, isFavorite: initialFav = false }) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [isFav, setIsFav] = useState(initialFav);
  const [favLoading, setFavLoading] = useState(false);
  const [cartMsg, setCartMsg] = useState('');

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { window.location.href = '/login'; return; }
    try {
      await addToCart(product.id_producto);
      setCartMsg('¡Agregado!');
      setTimeout(() => setCartMsg(''), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { window.location.href = '/login'; return; }
    if (favLoading) return;
    setFavLoading(true);
    try {
      const res = await reviewsAPI.toggleFavorite(product.id_producto);
      setIsFav(res.data.esFavorito);
    } catch (err) {
      console.error(err);
    } finally {
      setFavLoading(false);
    }
  };

  const rating = parseFloat(product.calificacion_promedio) || 0;
  const totalReviews = parseInt(product.total_resenas) || 0;
  const isNew = product.fecha_elaboracion_stock
    ? (Date.now() - new Date(product.fecha_elaboracion_stock)) < 7 * 24 * 60 * 60 * 1000
    : false;
  const isLowStock = product.stock > 0 && product.stock < 5;

  return (
    <Link to={`/producto/${product.id_producto}`} className="product-card">
      <div className="product-image-wrapper">
        <div className="product-image">
          {product.imagen_principal ? (
            <img src={product.imagen_principal} alt={product.nombre} />
          ) : (
            <div className="product-placeholder">
              {product.id_categoria <= 1 ? '🥖' : product.id_categoria === 2 ? '🎂' : product.id_categoria === 3 ? '🍪' : product.id_categoria === 4 ? '🍮' : product.id_categoria === 5 ? '🌾' : '🎉'}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="product-badges">
          {isNew && <span className="badge badge-new">✨ Nuevo</span>}
          {product.vida_util_dias && (
            <span className="badge badge-warning">
              <FiClock size={12} /> {product.vida_util_dias}d fresco
            </span>
          )}
          {!product.disponible && <span className="badge badge-error">Agotado</span>}
          {isLowStock && product.disponible && (
            <span className="badge badge-stock-low">🔥 Últimas {product.stock}</span>
          )}
        </div>

        {/* Quick actions */}
        <div className="product-actions-overlay">
          <button
            className="product-action-btn cart-btn"
            onClick={handleAddToCart}
            title="Agregar al carrito"
            disabled={!product.disponible || product.stock <= 0}
          >
            <FiShoppingCart size={18} />
          </button>
          <button
            className={`product-action-btn fav-btn ${isFav ? 'fav-active' : ''}`}
            onClick={handleToggleFav}
            title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            disabled={favLoading}
          >
            <FiHeart size={18} className={isFav ? 'heart-filled' : ''} />
          </button>
        </div>

        {/* Cart flash message */}
        {cartMsg && <div className="cart-flash">{cartMsg}</div>}
      </div>

      <div className="product-info">
        <span className="product-category">{product.categoria_nombre}</span>
        <h3 className="product-name">{product.nombre}</h3>

        {product.productor_nombre && (
          <span className="product-producer">por {product.productor_nombre}</span>
        )}

        {/* Rating */}
        <div className="product-rating">
          <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <FiStar
                key={star}
                size={14}
                className={star <= Math.round(rating) ? 'star-filled' : 'star-empty'}
              />
            ))}
          </div>
          {totalReviews > 0 && (
            <span className="rating-count">({totalReviews})</span>
          )}
        </div>

        {/* Preparation time */}
        <div className="product-meta">
          <span className="prep-time">
            <FiClock size={13} /> {product.tiempo_elaboracion_min} min
          </span>
        </div>

        {/* Price */}
        <div className="product-price-row">
          <span className="product-price">${parseFloat(product.precio).toFixed(2)}</span>
          {product.disponible && product.stock > 0 ? (
            <button className="btn btn-primary btn-sm add-to-cart-btn" onClick={handleAddToCart}>
              Agregar
            </button>
          ) : (
            <span className="badge badge-error">Agotado</span>
          )}
        </div>
      </div>
    </Link>
  );
}
