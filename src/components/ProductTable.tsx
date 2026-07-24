import { useState } from 'react';
import { Package, PackageOpen, Puzzle, Eye, X } from 'lucide-react';
import type { ProductDto } from '../types/api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { Stepper } from './Stepper';
import { Pagination, usePagination } from './Pagination';
import { money } from '../utils/format';

/** Umbral aproximado a partir del cual la descripción puede exceder 2 renglones. */
const LONG_DESC = 120;

function DescriptionModal({ product, onClose }: { product: ProductDto; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          Descripción — {product.code}
          <button className="modal-close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">
          <div className="desc-modal-title">{product.name}</div>
          <p className="desc-modal-text">{product.scope}</p>
        </div>
      </div>
    </div>
  );
}

interface ProductTableProps {
  products: ProductDto[];
  loading: boolean;
  hasSelection: boolean;
}

export function ProductTable({ products, loading, hasSelection }: ProductTableProps) {
  const { getQuantity, setBaseQuantity } = useCart();
  const { useTrmPricing } = useSettings();
  const [descProduct, setDescProduct] = useState<ProductDto | null>(null);
  const pager = usePagination(products, 8);

  if (loading) {
    return (
      <div className="catalog-card">
        <div className="spinner" />
      </div>
    );
  }

  if (!hasSelection) {
    return (
      <div className="catalog-card">
        <div className="empty-state">
          <div className="icon">
            <PackageOpen size={36} />
          </div>
          Selecciona una categoría para ver los productos
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="catalog-card">
        <div className="empty-state">
          <div className="icon">
            <PackageOpen size={36} />
          </div>
          No hay productos activos en esta subcategoría
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-card">
      <table className="product-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Add-ons | Paquete</th>
            <th>Descripción</th>
            <th style={{ textAlign: 'center' }}>Cantidad</th>
            <th style={{ textAlign: 'right' }}>Costo</th>
          </tr>
        </thead>
        <tbody>
          {pager.pageItems.map((p) => {
            const qty = getQuantity(p.productId);
            return (
              <tr key={p.productId}>
                <td className="cell-id">{p.code}</td>
                <td>
                  <div className="cell-name">
                    <span className="pkg-icon">
                      {p.isAddOn ? <Puzzle size={15} /> : <Package size={15} />}
                    </span>
                    {p.name}
                    {p.isAddOn && <span className="badge-addon">Add-on</span>}
                  </div>
                </td>
                <td className="cell-desc">
                  <div className="desc-wrap">
                    <span className="desc-clamp">{p.scope ?? '—'}</span>
                    {p.scope && p.scope.length > LONG_DESC && (
                      <button
                        className="desc-more"
                        title="Ver descripción completa"
                        onClick={() => setDescProduct(p)}
                      >
                        <Eye size={14} />
                      </button>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Stepper
                    value={qty}
                    max={p.maxQuantity}
                    onChange={(v) => setBaseQuantity(p, v)}
                  />
                </td>
                <td className="cell-cost">
                  <div className="cost-total">{money(p.priceCOP * Math.max(qty, 0))}</div>
                  <div className="cost-unit">
                    {useTrmPricing
                      ? `USD ${money(p.priceUSD)} · COP ${money(p.priceCOP)} c/u`
                      : `${money(p.priceCOP)} c/u`}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination pager={pager} />
      {descProduct && <DescriptionModal product={descProduct} onClose={() => setDescProduct(null)} />}
    </div>
  );
}
