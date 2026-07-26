import { FiCheckCircle, FiShoppingCart, FiX } from 'react-icons/fi';
import './CartToast.css';

export default function CartToast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="cart-toast-bubble animate-bounce-in">
      <div className="cart-toast-icon">
        <FiCheckCircle size={24} color="#22C55E" />
      </div>
      <div className="cart-toast-content">
        <h4>¡Producto agregado al carrito!</h4>
        <p>{toast.productName || 'Item listo en tu carrito'}</p>
      </div>
      <button className="cart-toast-close" onClick={onClose}>
        <FiX size={16} />
      </button>
    </div>
  );
}
