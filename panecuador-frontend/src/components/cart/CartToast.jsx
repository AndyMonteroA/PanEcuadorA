import { FiCheckCircle, FiX } from 'react-icons/fi';
import { FaBreadSlice } from 'react-icons/fa';
import './CartToast.css';

export default function CartToast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="cart-toast-bubble animate-bounce-in">
      <div className="cart-toast-media">
        {toast.productImage ? (
          <img src={toast.productImage} alt={toast.productName} className="cart-toast-img" />
        ) : (
          <div className="cart-toast-icon-placeholder">
            <FaBreadSlice size={20} color="var(--color-primary)" />
          </div>
        )}
        <div className="cart-toast-check-badge">
          <FiCheckCircle size={14} color="#ffffff" />
        </div>
      </div>
      <div className="cart-toast-content">
        <h4 className="cart-toast-title">¡Agregado al Carrito!</h4>
        <p className="cart-toast-name">{toast.productName || 'Producto listo'}</p>
      </div>
      <button className="cart-toast-close" onClick={onClose} aria-label="Cerrar">
        <FiX size={18} />
      </button>
    </div>
  );
}
