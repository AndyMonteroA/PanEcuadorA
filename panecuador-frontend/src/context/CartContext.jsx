import { createContext, useContext, useState, useCallback } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [resumen, setResumen] = useState({ subtotal: '0.00', totalItems: 0, tiempoElaboracionEstimado: 0 });
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await cartAPI.get();
      setItems(res.data.data.items);
      setResumen(res.data.data.resumen);
    } catch (err) {
      console.error('Error al cargar carrito:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const addToCart = async (id_producto, cantidad = 1) => {
    try {
      await cartAPI.add(id_producto, cantidad);
      await fetchCart();
      return true;
    } catch (err) {
      throw err.response?.data?.message || 'Error al agregar al carrito';
    }
  };

  const updateQuantity = async (id_carrito, cantidad) => {
    try {
      await cartAPI.update(id_carrito, cantidad);
      await fetchCart();
    } catch (err) {
      throw err.response?.data?.message || 'Error al actualizar cantidad';
    }
  };

  const removeItem = async (id_carrito) => {
    try {
      await cartAPI.remove(id_carrito);
      await fetchCart();
    } catch (err) {
      throw err.response?.data?.message || 'Error al eliminar item';
    }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clear();
      setItems([]);
      setResumen({ subtotal: '0.00', totalItems: 0, tiempoElaboracionEstimado: 0 });
    } catch (err) {
      console.error('Error al vaciar carrito:', err);
    }
  };

  const value = {
    items,
    resumen,
    loading,
    fetchCart,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    itemCount: resumen.totalItems
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de un CartProvider');
  }
  return context;
}
