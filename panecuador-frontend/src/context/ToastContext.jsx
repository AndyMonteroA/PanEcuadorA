import { createContext, useContext, useState, useCallback, useRef } from 'react';
import ToastContainer from '../components/cart/ToastContainer';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef({});

  const removeToast = useCallback((id) => {
    // 1. Mark as exiting to trigger fade-out CSS animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'exiting' } : t))
    );

    // 2. Remove after animation duration (300ms)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timeoutsRef.current[id];
    }, 300);
  }, []);

  const addToast = useCallback(
    ({ title, name, image, type = 'cart' }) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 6);

      const newToast = {
        id,
        title,
        name,
        image,
        type,
        status: 'entering'
      };

      setToasts((prev) => {
        // Keep at most 3 active toasts. If exceeding, trigger exit on the oldest
        let updated = [newToast, ...prev];
        if (updated.length > 3) {
          const overflowId = updated[updated.length - 1].id;
          setTimeout(() => removeToast(overflowId), 0);
        }
        return updated;
      });

      // Auto-dismiss after 3.5 seconds
      const timer = setTimeout(() => {
        removeToast(id);
      }, 3500);

      timeoutsRef.current[id] = timer;
    },
    [removeToast]
  );

  const notifyCart = useCallback((productName, productImage) => {
    addToast({
      title: '¡Agregado al Carrito!',
      name: productName || 'Producto agregado',
      image: productImage,
      type: 'cart'
    });
  }, [addToast]);

  const notifyFavorite = useCallback((productName, productImage, isAdded) => {
    addToast({
      title: isAdded ? '¡Guardado en Favoritos!' : 'Quitado de Favoritos',
      name: productName || 'Producto',
      image: productImage,
      type: isAdded ? 'fav_add' : 'fav_remove'
    });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, notifyCart, notifyFavorite, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser usado dentro de un ToastProvider');
  }
  return context;
}
