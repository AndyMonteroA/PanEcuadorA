import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiShoppingCart, FiHeart, FiStar, FiMinus, FiPlus, FiChevronLeft, FiPackage, FiAlertCircle, FiX, FiZoomIn, FiChevronRight } from 'react-icons/fi';
import { productsAPI, reviewsAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/product/ProductCard';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedMsg, setAddedMsg] = useState('');
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const zoomRef = useRef(null);

  // Similar products
  const [similarProducts, setSimilarProducts] = useState([]);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setActiveImageIndex(0);
      setQuantity(1);
      try {
        const res = await productsAPI.getById(id);
        setProduct(res.data.data);
        setIsFav(res.data.data.esFavorito || false);

        // Fetch similar products
        try {
          const simRes = await productsAPI.getSimilar(id);
          setSimilarProducts(simRes.data.data || []);
        } catch { setSimilarProducts([]); }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
    window.scrollTo(0, 0);
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

  const handleToggleFav = async () => {
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

  // Zoom handlers
  const handleImageClick = () => {
    setZoomScale(1);
    setZoomPos({ x: 50, y: 50 });
    setShowZoom(true);
  };

  const handleZoomWheel = (e) => {
    e.preventDefault();
    setZoomScale(prev => {
      const next = prev + (e.deltaY < 0 ? 0.3 : -0.3);
      return Math.min(Math.max(1, next), 4);
    });
  };

  const handleZoomMouseMove = (e) => {
    if (!zoomRef.current || zoomScale <= 1) return;
    const rect = zoomRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  const handleZoomClose = () => {
    setShowZoom(false);
    setZoomScale(1);
  };

  // Navigate gallery in lightbox
  const navigateGallery = (dir) => {
    if (!product?.galeria) return;
    const len = product.galeria.length;
    setActiveImageIndex(prev => (prev + dir + len) % len);
    setZoomScale(1);
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
  const galeria = product.galeria || [];
  const activeImage = galeria.length > 0 ? galeria[activeImageIndex]?.url_archivo : null;

  // Reviews distribution (count per star)
  const resenas = product.resenas || [];
  const starDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: resenas.filter(r => r.calificacion === star).length
  }));
  const maxStarCount = Math.max(...starDist.map(s => s.count), 1);

  return (
    <div className="product-detail-page">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/catalogo"><FiChevronLeft /> Catálogo</Link>
          {product.categoria_nombre && (
            <span> / {product.categoria_nombre}</span>
          )}
          <span> / {product.nombre}</span>
        </div>

        <div className="product-detail-grid">
          {/* ============ GALLERY ============ */}
          <div className="pd-gallery">
            <div className="pd-main-image" onClick={handleImageClick}>
              {activeImage ? (
                <>
                  <img src={activeImage} alt={product.nombre} />
                  <div className="pd-zoom-hint">
                    <FiZoomIn size={20} />
                    <span>Click para ampliar</span>
                  </div>
                </>
              ) : (
                <div className="product-placeholder" style={{ height: '100%', fontSize: '8rem' }}>
                  {product.id_categoria <= 1 ? '🥖' : '🎂'}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {galeria.length > 1 && (
              <div className="pd-thumbnails">
                {galeria.map((item, idx) => (
                  <div
                    key={idx}
                    className={`pd-thumb ${idx === activeImageIndex ? 'pd-thumb-active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <img src={item.url_archivo} alt={`${product.nombre} ${idx + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ============ INFO ============ */}
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

            {/* Product details cards — only consumer-relevant info */}
            <div className="pd-details-grid">
              <div className="pd-detail-card">
                <FiAlertCircle size={20} />
                <div>
                  <strong>{product.vida_util_dias} días</strong>
                  <span>Vida útil</span>
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
                <h3>🧾 Ingredientes</h3>
                <p>{product.ingredientes}</p>
              </div>
            )}

            {/* Add to cart */}
            <div className="pd-actions">
              <button
                className={`pd-fav-btn ${isFav ? 'fav-active' : ''}`}
                onClick={handleToggleFav}
                disabled={favLoading}
                title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                <FiHeart size={20} className={isFav ? 'heart-filled' : ''} />
                {isFav ? 'En favoritos' : 'Favorito'}
              </button>

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

            {/* Stock info — without estimation time */}
            <div className="pd-stock-info">
              {product.stock > 0 ? (
                <span className="badge badge-success">✅ {product.stock} en stock</span>
              ) : (
                <span className="badge badge-error">❌ Agotado</span>
              )}
            </div>
          </div>
        </div>

        {/* ============ REVIEWS SECTION ============ */}
        <div className="pd-reviews-section">
          <h2 className="section-title">⭐ Reseñas de clientes</h2>

          {/* Review Summary */}
          <div className="pd-reviews-summary">
            <div className="pd-reviews-score">
              <span className="pd-score-big">{rating.toFixed(1)}</span>
              <div className="stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <FiStar key={star} size={20}
                    className={star <= Math.round(rating) ? 'star-filled' : 'star-empty'} />
                ))}
              </div>
              <span className="pd-score-count">{totalReviews} reseña{totalReviews !== 1 ? 's' : ''}</span>
            </div>

            <div className="pd-star-bars">
              {starDist.map(({ star, count }) => (
                <div key={star} className="pd-star-bar-row">
                  <span className="pd-star-label">{star} <FiStar size={12} className="star-filled" /></span>
                  <div className="pd-star-bar-track">
                    <div
                      className="pd-star-bar-fill"
                      style={{ width: `${(count / maxStarCount) * 100}%` }}
                    />
                  </div>
                  <span className="pd-star-bar-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review List */}
          {resenas.length > 0 ? (
            <div className="pd-reviews-list">
              {resenas.map((review, idx) => (
                <div key={idx} className="review-card card">
                  <div className="review-header">
                    <div className="review-author">
                      <div className="review-avatar">
                        {review.nombre?.charAt(0)}{review.apellido?.charAt(0)}
                      </div>
                      <strong>{review.nombre} {review.apellido}</strong>
                    </div>
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map(s => (
                        <FiStar key={s} size={14}
                          className={s <= review.calificacion ? 'star-filled' : 'star-empty'} />
                      ))}
                    </div>
                  </div>
                  {review.comentario && <p className="review-comment">{review.comentario}</p>}
                  <span className="review-date">
                    {new Date(review.fecha).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="pd-reviews-empty">
              <span className="empty-emoji">💬</span>
              <p>Aún no hay reseñas para este producto.</p>
              <p className="text-muted">¡Sé el primero en compartir tu opinión!</p>
            </div>
          )}
        </div>

        {/* ============ SIMILAR PRODUCTS ============ */}
        {similarProducts.length > 0 && (
          <div className="pd-similar-section">
            <h2 className="section-title">🍞 Productos similares que podrían gustarte</h2>
            <div className="pd-similar-grid">
              {similarProducts.map(p => (
                <ProductCard key={p.id_producto} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============ ZOOM LIGHTBOX MODAL ============ */}
      {showZoom && activeImage && (
        <div className="pd-lightbox" onClick={handleZoomClose}>
          <button className="pd-lightbox-close" onClick={handleZoomClose}>
            <FiX size={24} />
          </button>

          {galeria.length > 1 && (
            <>
              <button className="pd-lightbox-nav pd-lightbox-prev" onClick={(e) => { e.stopPropagation(); navigateGallery(-1); }}>
                <FiChevronLeft size={28} />
              </button>
              <button className="pd-lightbox-nav pd-lightbox-next" onClick={(e) => { e.stopPropagation(); navigateGallery(1); }}>
                <FiChevronRight size={28} />
              </button>
            </>
          )}

          <div
            ref={zoomRef}
            className="pd-lightbox-image-wrapper"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleZoomWheel}
            onMouseMove={handleZoomMouseMove}
          >
            <img
              src={activeImage}
              alt={product.nombre}
              className="pd-lightbox-image"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`
              }}
              draggable={false}
            />
          </div>

          <div className="pd-lightbox-counter">
            {activeImageIndex + 1} / {galeria.length}
          </div>

          <div className="pd-lightbox-zoom-hint">
            Usa la rueda del mouse para hacer zoom · Click fuera para cerrar
          </div>
        </div>
      )}
    </div>
  );
}
