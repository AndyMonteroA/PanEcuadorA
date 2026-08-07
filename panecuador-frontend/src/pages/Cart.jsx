import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiTrash2, FiMinus, FiPlus, FiShoppingCart, FiArrowRight, FiAlertTriangle, FiLock, FiBox, FiClock, FiCheck } from 'react-icons/fi';
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
            <FiLock size={48} color="var(--text-muted)" style={{ marginBottom: 12 }} />
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
            <FiShoppingCart size={48} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <h3>Tu carrito está vacío</h3>
            <p>Explora nuestro catálogo y agrega productos deliciosos</p>
            <Link to="/catalogo" className="btn btn-primary btn-lg">Explorar Catálogo</Link>
          </div>
        </div>
      </div>
    );
  }

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
              <CartItem key={item.id_carrito} item={item} updateQuantity={updateQuantity} removeItem={removeItem} />
            ))}
          </div>

          {/* Summary */}
          <aside className="cart-summary card">
            <h3>Resumen del pedido</h3>

            <div className="summary-row">
              <span>Productos ({resumen.totalItems})</span>
              <span>${parseFloat(resumen.subtotal).toFixed(2)}</span>
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

/**
 * CartItem — con input de cantidad editable
 */
function CartItem({ item, updateQuantity, removeItem }) {
  const [localQty, setLocalQty] = useState(item.cantidad);
  const [updating, setUpdating] = useState(false);
  const debounceRef = useRef(null);

  // Sync local state when item changes from API
  useEffect(() => {
    setLocalQty(item.cantidad);
  }, [item.cantidad]);

  const handleQtyChange = (newQty) => {
    // Validate
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) {
      setLocalQty(newQty); // Allow typing, validate on blur
      return;
    }
    if (qty > 100) {
      setLocalQty(100);
      commitQty(100);
      return;
    }
    setLocalQty(qty);
    
    // Debounce API call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitQty(qty), 500);
  };

  const commitQty = async (qty) => {
    if (qty === item.cantidad) return;
    setUpdating(true);
    try {
      await updateQuantity(item.id_carrito, qty);
    } catch (err) {
      setLocalQty(item.cantidad); // Revert on error
    } finally {
      setUpdating(false);
    }
  };

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const qty = parseInt(localQty);
    if (isNaN(qty) || qty < 1) {
      setLocalQty(item.cantidad);
      return;
    }
    const clampedQty = Math.min(qty, 100);
    setLocalQty(clampedQty);
    commitQty(clampedQty);
  };

  return (
    <div className={`cart-item card ${updating ? 'cart-item-updating' : ''}`}>
      <div className="cart-item-image">
        {item.imagen ? (
          <img src={item.imagen} alt={item.nombre} />
        ) : (
          <div className="product-placeholder" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiBox size={24} color="var(--color-primary)" />
          </div>
        )}
      </div>

      <div className="cart-item-info">
        <Link to={`/producto/${item.id_producto}`} className="cart-item-name">
          {item.nombre}
        </Link>


      </div>

      <div className="cart-item-quantity">
        <div className="quantity-selector">
          <button 
            onClick={() => handleQtyChange(Math.max(1, (parseInt(localQty) || 1) - 1))}
            disabled={localQty <= 1 || updating}
          >
            <FiMinus />
          </button>
          <input
            type="number"
            className="qty-input"
            value={localQty}
            onChange={(e) => handleQtyChange(e.target.value)}
            onBlur={handleBlur}
            min={1}
            max={100}
          />
          <button 
            onClick={() => handleQtyChange((parseInt(localQty) || 0) + 1)}
            disabled={(parseInt(localQty) || 0) >= 100 || updating}
          >
            <FiPlus />
          </button>
        </div>
        {/* Desglose de disponibilidad */}
        {item.requiere_reposicion ? (
          <div className="cart-stock-breakdown">
            <span className="stock-badge stock-immediate">
              <FiCheck size={11} /> {item.disponible_inmediato} disponible{item.disponible_inmediato !== 1 ? 's' : ''}
            </span>
            <span className="stock-badge stock-pending">
              <FiClock size={11} /> {item.pendiente_reposicion} en producción
            </span>
          </div>
        ) : item.stock <= 5 && (
          <span className="qty-stock-hint">Stock: {item.stock}</span>
        )}
      </div>

      <div className="cart-item-price">
        <span className="item-total">${(parseFloat(item.precio) * (parseInt(localQty) || 1)).toFixed(2)}</span>
        <span className="item-unit">${parseFloat(item.precio).toFixed(2)} c/u</span>
      </div>

      <button className="cart-item-remove" onClick={() => removeItem(item.id_carrito)}>
        <FiTrash2 />
      </button>
    </div>
  );
}
