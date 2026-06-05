import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiShoppingCart, FiHeart, FiClock, FiStar, FiMinus, FiPlus, FiChevronLeft, FiPackage, FiAlertCircle } from 'react-icons/fi';
import { productsAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedMsg, setAddedMsg] = useState('');

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const res = await productsAPI.getById(id);
        setProduct(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) { window.location.href = '/login'; return; }
    try {
      await addToCart(product.id_producto, quantity);
      setAddedMsg('¡Agregado al carrito!');
      setTimeout(() => setAddedMsg(''), 3000);
    } catch (err) {
      setAddedMsg(typeof err === 'string' ? err : 'Error al agregar');
    }
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="loading-screen"><div className="spinner" /><p>Cargando producto...</p></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="empty-state">
            <span className="empty-emoji">😢</span>
            <h3>Producto no encontrado</h3>
            <Link to="/catalogo" className="btn btn-primary">Volver al catálogo</Link>
          </div>
        </div>
      </div>
    );
  }

  const rating = parseFloat(product.calificacion_promedio) || 0;
  const totalReviews = parseInt(product.total_resenas) || 0;

  return (
    <div className="product-detail-page">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/catalogo"><FiChevronLeft /> Catálogo</Link>
          {product.categoria_nombre && (
            <span> / {product.categoria_nombre}</span>
          )}
        </div>

        <div className="product-detail-grid">
          {/* Image section */}
          <div className="pd-gallery">
            <div className="pd-main-image">
              {product.galeria && product.galeria.length > 0 ? (
                <img src={product.galeria[0].url_archivo} alt={product.nombre} />
              ) : (
                <div className="product-placeholder" style={{ height: '100%', fontSize: '8rem' }}>
                  {product.id_categoria <= 1 ? '🥖' : '🎂'}
                </div>
              )}
            </div>
            {product.galeria && product.galeria.length > 1 && (
              <div className="pd-thumbnails">
                {product.galeria.map((item, idx) => (
                  <div key={idx} className="pd-thumb">
                    <img src={item.url_archivo} alt={`${product.nombre} ${idx + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info section */}
          <div className="pd-info">
            <span className="pd-category">{product.categoria_nombre}</span>
            <h1 className="pd-name">{product.nombre}</h1>

            {product.productor_nombre && (
              <p className="pd-producer">
                <FiPackage size={14} /> por <strong>{product.productor_nombre}</strong>
                {product.productor_ciudad && ` — ${product.productor_ciudad}`}
              </p>
            )}

            {/* Rating */}
            <div className="pd-rating">
              <div className="stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <FiStar key={star} size={18}
                    className={star <= Math.round(rating) ? 'star-filled' : 'star-empty'} />
                ))}
              </div>
              <span>{rating.toFixed(1)}</span>
              <span className="pd-reviews-count">({totalReviews} reseñas)</span>
            </div>

            {/* Price */}
            <div className="pd-price-box">
              <span className="pd-price">${parseFloat(product.precio).toFixed(2)}</span>
              {product.peso_gramos && (
                <span className="pd-weight">{product.peso_gramos}g</span>
              )}
            </div>

            {/* Description */}
            <div className="pd-description">
              <p>{product.descripcion}</p>
            </div>

            {/* Product details cards */}
            <div className="pd-details-grid">
              <div className="pd-detail-card">
                <FiClock size={20} />
                <div>
                  <strong>{product.tiempo_elaboracion_min} min</strong>
                  <span>Tiempo elaboración</span>
                </div>
              </div>
              <div className="pd-detail-card">
                <FiAlertCircle size={20} />
                <div>
                  <strong>{product.vida_util_dias} días</strong>
                  <span>Vida útil</span>
                </div>
              </div>
              <div className="pd-detail-card">
                <FiStar size={20} />
                <div>
                  <strong>{product.complejidad}/5</strong>
                  <span>Complejidad</span>
                </div>
              </div>
              <div className="pd-detail-card">
                <FiPackage size={20} />
                <div>
                  <strong>{product.num_ingredientes}</strong>
                  <span>Ingredientes</span>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            {product.ingredientes && (
              <div className="pd-ingredients">
                <h3>Ingredientes</h3>
                <p>{product.ingredientes}</p>
              </div>
            )}

            {/* Add to cart */}
            <div className="pd-actions">
              <div className="quantity-selector">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                  <FiMinus />
                </button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(Math.min(100, quantity + 1))}>
                  <FiPlus />
                </button>
              </div>

              <button
                className="btn btn-primary btn-lg pd-add-btn"
                onClick={handleAddToCart}
                disabled={!product.disponible || product.stock <= 0}
              >
                <FiShoppingCart />
                {product.disponible && product.stock > 0
                  ? `Agregar al carrito — $${(parseFloat(product.precio) * quantity).toFixed(2)}`
                  : 'Producto agotado'}
              </button>
            </div>

            {addedMsg && (
              <div className={`pd-toast ${addedMsg.includes('Error') ? 'toast-error' : 'toast-success'}`}>
                {addedMsg}
              </div>
            )}

            {/* Stock info */}
            <div className="pd-stock-info">
              {product.stock > 0 ? (
                <span className="badge badge-success">✅ {product.stock} en stock</span>
              ) : (
                <span className="badge badge-error">❌ Agotado</span>
              )}
              <span className="badge badge-primary">
                ⏱ Estimación: ~{product.tiempo_elaboracion_min * quantity} min para {quantity} unidad(es)
              </span>
            </div>
          </div>
        </div>

        {/* Reviews section */}
        {product.resenas && product.resenas.length > 0 && (
          <div className="pd-reviews-section">
            <h2 className="section-title">Reseñas de clientes</h2>
            <div className="pd-reviews-list">
              {product.resenas.map((review, idx) => (
                <div key={idx} className="review-card card">
                  <div className="review-header">
                    <strong>{review.nombre} {review.apellido}</strong>
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map(s => (
                        <FiStar key={s} size={14}
                          className={s <= review.calificacion ? 'star-filled' : 'star-empty'} />
                      ))}
                    </div>
                  </div>
                  {review.comentario && <p className="review-comment">{review.comentario}</p>}
                  <span className="review-date">
                    {new Date(review.fecha).toLocaleDateString('es-EC')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
