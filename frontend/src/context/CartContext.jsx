import { createContext, useContext, useState, useCallback } from 'react';
import { trackEvent, AnalyticsEvents } from '../utils/trackEvent';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      if (prev.find((i) => i.id === item.id)) return prev;
      trackEvent(AnalyticsEvents.ADD_TO_CART, {
        path: '/portfolio',
        itemId: item.id,
        itemTitle: item.title,
      });
      return [...prev, item];
    });
    setIsOpen(true);
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleCart = useCallback(() => setIsOpen((o) => !o), []);

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider value={{
      cart, isOpen, addToCart, removeFromCart, clearCart, toggleCart, setIsOpen, total,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
