import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ProductDto } from '../types/api';

/** Add-on anidado bajo un paquete base (regla del API: RN — add-ons requieren base compatible). */
export interface CartAddOn {
  product: ProductDto;
  quantity: number;
}

export interface CartLine {
  product: ProductDto;
  quantity: number;
  addOns: CartAddOn[];
}

interface CartState {
  lines: CartLine[];
  totalItems: number;
  totalComponents: number;
  totalCOP: number;
  setBaseQuantity: (product: ProductDto, quantity: number) => void;
  setAddOnQuantity: (baseProductId: number, addOn: ProductDto, quantity: number) => void;
  getQuantity: (productId: number) => number;
  removeLine: (productId: number) => void;
  removeAddOn: (baseProductId: number, addOnProductId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartState | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const setBaseQuantity = useCallback((product: ProductDto, quantity: number) => {
    setLines((prev) => {
      const exists = prev.find((l) => l.product.productId === product.productId);
      if (quantity <= 0) return prev.filter((l) => l.product.productId !== product.productId);
      if (exists) {
        return prev.map((l) =>
          l.product.productId === product.productId ? { ...l, quantity } : l,
        );
      }
      return [...prev, { product, quantity, addOns: [] }];
    });
  }, []);

  const setAddOnQuantity = useCallback(
    (baseProductId: number, addOn: ProductDto, quantity: number) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.product.productId !== baseProductId) return l;
          const rest = l.addOns.filter((a) => a.product.productId !== addOn.productId);
          return {
            ...l,
            addOns: quantity <= 0 ? rest : [...rest, { product: addOn, quantity }],
          };
        }),
      );
    },
    [],
  );

  const getQuantity = useCallback(
    (productId: number) => lines.find((l) => l.product.productId === productId)?.quantity ?? 0,
    [lines],
  );

  const removeLine = useCallback(
    (productId: number) => setLines((prev) => prev.filter((l) => l.product.productId !== productId)),
    [],
  );

  const removeAddOn = useCallback(
    (baseProductId: number, addOnProductId: number) =>
      setLines((prev) =>
        prev.map((l) =>
          l.product.productId === baseProductId
            ? { ...l, addOns: l.addOns.filter((a) => a.product.productId !== addOnProductId) }
            : l,
        ),
      ),
    [],
  );

  const clear = useCallback(() => setLines([]), []);

  const { totalItems, totalComponents, totalCOP } = useMemo(() => {
    let items = 0;
    let components = 0;
    let total = 0;
    for (const l of lines) {
      items += l.quantity;
      components += 1 + l.addOns.length;
      total += l.product.priceCOP * l.quantity;
      for (const a of l.addOns) {
        items += a.quantity;
        total += a.product.priceCOP * a.quantity;
      }
    }
    return { totalItems: items, totalComponents: components, totalCOP: total };
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      totalItems,
      totalComponents,
      totalCOP,
      setBaseQuantity,
      setAddOnQuantity,
      getQuantity,
      removeLine,
      removeAddOn,
      clear,
    }),
    [lines, totalItems, totalComponents, totalCOP, setBaseQuantity, setAddOnQuantity, getQuantity, removeLine, removeAddOn, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
