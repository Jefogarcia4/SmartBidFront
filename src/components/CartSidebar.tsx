import { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronRight, ShoppingCart } from 'lucide-react';
import type { CartLine } from '../context/CartContext';
import { useCart } from '../context/CartContext';
import { catalogApi } from '../api/services';
import type { ProductDto } from '../types/api';
import { Stepper } from './Stepper';
import { money } from '../utils/format';

function CartItem({ line }: { line: CartLine }) {
  const { removeLine, setAddOnQuantity } = useCart();
  const [open, setOpen] = useState(false);
  const [addOns, setAddOns] = useState<ProductDto[] | null>(null);

  // Carga add-ons compatibles del paquete base (GET /api/products/{id}/addons)
  useEffect(() => {
    if (open && addOns === null) {
      catalogApi
        .compatibleAddOns(line.product.productId)
        .then(setAddOns)
        .catch(() => setAddOns([]));
    }
  }, [open, addOns, line.product.productId]);

  const lineTotal =
    line.product.priceCOP * line.quantity +
    line.addOns.reduce((sum, a) => sum + a.product.priceCOP * a.quantity, 0);

  return (
    <div className="cart-item">
      <div className="cart-item-head">
        <div>
          <div className="cart-item-name">{line.product.name}</div>
          <div className="cart-item-path">
            {line.product.categoryName} &gt; {line.product.subcategoryName}
          </div>
        </div>
        <button
          className="cart-item-remove"
          title="Quitar"
          onClick={() => removeLine(line.product.productId)}
        >
          <X size={15} />
        </button>
      </div>

      <div className="cart-item-foot">
        <span>Cantidad: {line.quantity}</span>
        <span className="cart-item-price">{money(lineTotal)}</span>
      </div>

      {!line.product.isAddOn && (
      <div className="cart-addons">
        <button className="cart-addons-toggle" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          Add-ons compatibles{line.addOns.length > 0 ? ` (${line.addOns.length})` : ''}
        </button>
        {open &&
          (addOns === null ? (
            <div className="cart-item-path" style={{ paddingTop: 6 }}>
              Cargando…
            </div>
          ) : addOns.length === 0 ? (
            <div className="cart-item-path" style={{ paddingTop: 6 }}>
              Este paquete no tiene add-ons compatibles
            </div>
          ) : (
            addOns.map((a) => {
              const current =
                line.addOns.find((x) => x.product.productId === a.productId)?.quantity ?? 0;
              return (
                <div className="cart-addon-row" key={a.productId}>
                  <span style={{ flex: 1 }}>
                    {a.name}
                    <span className="cart-item-path">{money(a.priceCOP)} c/u</span>
                  </span>
                  <Stepper
                    value={current}
                    max={a.maxQuantity}
                    onChange={(v) => setAddOnQuantity(line.product.productId, a, v)}
                  />
                </div>
              );
            })
          ))}
      </div>
      )}
    </div>
  );
}

interface CartSidebarProps {
  onExport: () => void;
}

export function CartSidebar({ onExport }: CartSidebarProps) {
  const { lines, totalCOP, totalComponents } = useCart();

  return (
    <aside className="cart">
      <div className="cart-header">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ShoppingCart size={16} /> Cotización
        </span>
        <span className="cart-count">{totalComponents} componentes</span>
      </div>

      <div className="cart-items">
        {lines.length === 0 ? (
          <div className="cart-empty">
            Agrega paquetes del catálogo para construir la cotización
          </div>
        ) : (
          lines.map((l) => <CartItem key={l.product.productId} line={l} />)
        )}
      </div>

      <div className="cart-total">
        <small>Total:</small>
        <strong>{money(totalCOP)}</strong>
      </div>
      <button className="export-btn" disabled={lines.length === 0} onClick={onExport}>
        Exportar Cotización
      </button>
    </aside>
  );
}
