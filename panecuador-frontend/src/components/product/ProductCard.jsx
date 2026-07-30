import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingCart, FiHeart, FiStar, FiBox, FiClock, FiAward, FiAlertTriangle } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { productsAPI, reviewsAPI } from '../../services/api';
import './ProductCard.css';

export default function ProductCard({ product, isFavorite: initialFav = false }) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { notifyFavorite, addToast } = useToast();
  const [isFav, setIsFav] = useState(initialFav);
  const [favLoading, setFavLoading] = useState(false);
  const [cartMsg, setCartMsg] = useState('');

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { window.location.href = '/login'; return; }
    try {
      await addToCart(product.id_producto, 1, product.nombre, product.imagen_principal);
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
      const newFavState = res.data.esFavorito;
      setIsFav(newFavState);
      notifyFavorite(product.nombre, product.imagen_principal, newFavState);
    } catch (err) {
      console.error(err);
    } finally {
      setFavLoading(false);
    }
  };

  const handleSubscribeRestock = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { window.location.href = '/login'; return; }
    try {
      await productsAPI.subscribeRestock(product.id_producto);
      addToast({
        title: '🔔 Alerta de Hornada Activada',
        name: `Te avisaremos cuando "${product.nombre}" salga calientito del horno.`,
        image: product.imagen_principal,
        type: 'fav_add'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const rating = parseFloat(product.calificacion_promedio) || 0;
  const totalReviews = parseInt(product.total_resenas) || 0;
  const isNew = product.fecha_elaboracion_stock
    ? (Date.now() - new Date(product.fecha_elaboracion_stock)) < 7 * 24 * 60 * 60 * 1000
    : false;
  const isLowStock = product.stock > 0 && product.stock < 5;
  const isOut = !product.disponible || product.stock <= 0;

  return (
    <Link to={`/producto/${product.id_producto}`} className={`product-card ${isOut ? 'product-card-out' : ''}`}>
      <div className="product-image-wrapper">
        <div className="product-image">
          {product.imagen_principal ? (
            <img src={product.imagen_principal} alt={product.nombre} />
          ) : (
            <div className="product-placeholder">
              <FiBox size={32} color="var(--color-primary)" />
            </div>
          )}
        </div>

        <div className="product-badges">
          {isNew && !isOut && (
            <span className="badge badge-new"><FiAward size={12} /> Nuevo</span>
          )}
          {isOut && (
            <span className="badge badge-error"><FiClock size={12} /> Próxima Hornada</span>
          )}
          {isLowStock && !isOut && (
            <span className="badge badge-stock-low"><FiAlertTriangle size={12} /> ¡Pocas unidades!</span>
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



        {/* Price & Add to Cart */}
        <div className="product-price-row">
          <span className="product-price">${parseFloat(product.precio).toFixed(2)}</span>
          <button className="btn btn-primary btn-sm add-to-cart-btn" onClick={handleAddToCart}>
            {product.stock <= 0 ? '🥖 Reservar' : 'Agregar'}
          </button>
        </div>
      </div>
    </Link>
  );
}
