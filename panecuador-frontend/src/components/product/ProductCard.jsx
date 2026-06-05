import { Link } from 'react-router-dom';
import { FiShoppingCart, FiHeart, FiClock, FiStar } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    try {
      await addToCart(product.id_producto);
    } catch (err) {
      console.error(err);
    }
  };

  const rating = parseFloat(product.calificacion_promedio) || 0;
  const totalReviews = parseInt(product.total_resenas) || 0;

  return (
    <Link to={`/producto/${product.id_producto}`} className="product-card">
      <div className="product-image-wrapper">
        <div className="product-image">
          {product.imagen_principal ? (
            <img src={product.imagen_principal} alt={product.nombre} />
          ) : (
            <div className="product-placeholder">
              {product.id_categoria <= 1 ? '🥖' : '🎂'}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="product-badges">
          {product.vida_util_dias && (
            <span className="badge badge-warning">
              <FiClock size={12} /> {product.vida_util_dias}d fresco
            </span>
          )}
          {!product.disponible && (
            <span className="badge badge-error">Agotado</span>
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
          <button className="product-action-btn" title="Favorito">
            <FiHeart size={18} />
          </button>
        </div>
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
