import { FiCheckCircle, FiHeart, FiX } from 'react-icons/fi';
import { FaBreadSlice } from 'react-icons/fa';
import './ToastContainer.css';

export default function ToastContainer({ toasts, onClose }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-stack-container">
      {toasts.map((toast) => {
        const isExiting = toast.status === 'exiting';

        return (
          <div
            key={toast.id}
            className={`toast-bubble ${isExiting ? 'toast-exiting' : 'toast-entering'} toast-type-${toast.type}`}
          >
            <div className="toast-media">
              {toast.image ? (
                <img src={toast.image} alt={toast.name} className="toast-img" />
              ) : (
                <div className="toast-icon-placeholder">
                  <FaBreadSlice size={20} color="var(--color-primary)" />
                </div>
              )}

              <div className={`toast-type-badge badge-${toast.type}`}>
                {toast.type === 'cart' && <FiCheckCircle size={14} color="#ffffff" />}
                {toast.type === 'fav_add' && <FiHeart size={13} color="#ffffff" fill="#ffffff" />}
                {toast.type === 'fav_remove' && <FiHeart size={13} color="#ffffff" />}
              </div>
            </div>

            <div className="toast-content">
              <h4 className={`toast-title title-${toast.type}`}>{toast.title}</h4>
              <p className="toast-name">{toast.name}</p>
            </div>

            <button
              className="toast-close"
              onClick={() => onClose(toast.id)}
              aria-label="Cerrar notificación"
            >
              <FiX size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
