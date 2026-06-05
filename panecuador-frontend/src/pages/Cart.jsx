import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiTrash2, FiMinus, FiPlus, FiShoppingCart, FiClock, FiArrowRight, FiAlertTriangle } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Cart.css';

export default function Cart() {
  const { items, resumen, loading, fetchCart, updateQuantity, removeItem, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) fetchCart();
  }, [isAuthenticated, fetchCart]);

  if (!isAuthenticated) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="empty-state">
            <span className="empty-emoji">🔐</span>
            <h3>Inicia sesión para ver tu carrito</h3>
            <Link to="/login" className="btn btn-primary">Ingresar</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="loading-screen"><div className="spinner" /><p>Cargando carrito...</p></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="empty-state">
            <span className="empty-emoji">🛒</span>
            <h3>Tu carrito está vacío</h3>
            <p>Explora nuestro catálogo y agrega productos deliciosos</p>
            <Link to="/catalogo" className="btn btn-primary btn-lg">Explorar Catálogo</Link>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (min) => {
    if (min < 60) return `${min} min`;
    const hours = Math.floor(min / 60);
    const mins = min % 60;
    return `${hours}h ${mins > 0 ? mins + 'min' : ''}`;
  };

  return (
    <div className="cart-page">
      <div className="container">
        <div className="cart-header">
          <h1><FiShoppingCart /> Tu Carrito</h1>
          <button className="btn btn-secondary btn-sm" onClick={clearCart}>
            <FiTrash2 /> Vaciar carrito
          </button>
        </div>

        <div className="cart-layout">
          {/* Items */}
          <div className="cart-items">
            {items.map((item) => (
              <div key={item.id_carrito} className="cart-item card">
                <div className="cart-item-image">
                  {item.imagen ? (
                    <img src={item.imagen} alt={item.nombre} />
                  ) : (
                    <div className="product-placeholder" style={{ height: '100%' }}>🍞</div>
                  )}
                </div>

                <div className="cart-item-info">
                  <Link to={`/producto/${item.id_producto}`} className="cart-item-name">
                    {item.nombre}
                  </Link>
                  {item.productor_nombre && (
                    <span className="cart-item-producer">por {item.productor_nombre}</span>
                  )}
                  <div className="cart-item-meta">
                    <span className="badge badge-primary">
                      <FiClock size={12} /> {item.tiempo_elaboracion_min * item.cantidad} min
                    </span>
                  </div>
                </div>

                <div className="cart-item-quantity">
                  <div className="quantity-selector">
                    <button onClick={() => updateQuantity(item.id_carrito, item.cantidad - 1)}
                      disabled={item.cantidad <= 1}>
                      <FiMinus />
                    </button>
                    <span>{item.cantidad}</span>
                    <button onClick={() => updateQuantity(item.id_carrito, item.cantidad + 1)}>
                      <FiPlus />
                    </button>
                  </div>
                </div>

                <div className="cart-item-price">
                  <span className="item-total">${parseFloat(item.subtotal).toFixed(2)}</span>
                  <span className="item-unit">${parseFloat(item.precio).toFixed(2)} c/u</span>
                </div>

                <button className="cart-item-remove" onClick={() => removeItem(item.id_carrito)}>
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <aside className="cart-summary card">
            <h3>Resumen del pedido</h3>

            <div className="summary-row">
              <span>Productos ({resumen.totalItems})</span>
              <span>${parseFloat(resumen.subtotal).toFixed(2)}</span>
            </div>

            <div className="summary-row">
              <span><FiClock size={14} /> Tiempo elaboración</span>
              <span>{formatTime(resumen.tiempoElaboracionEstimado)}</span>
            </div>

            {resumen.superaLimite && (
              <div className="summary-warning">
                <FiAlertTriangle />
                <span>Máximo 100 productos por pedido. Tienes {resumen.totalItems}.</span>
              </div>
            )}

            <div className="summary-divider" />

            <div className="summary-row summary-total">
              <span>Total</span>
              <span>${parseFloat(resumen.subtotal).toFixed(2)}</span>
            </div>

            <button
              className="btn btn-primary btn-lg summary-checkout-btn"
              disabled={resumen.superaLimite}
              onClick={() => navigate('/checkout')}
            >
              Proceder al pago <FiArrowRight />
            </button>

            <Link to="/catalogo" className="summary-continue">
              Seguir comprando
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
