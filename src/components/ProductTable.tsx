import { useState } from 'react';
import { Package, PackageOpen, Puzzle, Eye, X, Clock } from 'lucide-react';
import type { ProductDto } from '../types/api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { Stepper } from './Stepper';
import { Pagination, usePagination } from './Pagination';
import { money, platformChips } from '../utils/format';

/** Umbral aproximado a partir del cual la descripción puede exceder 2 renglones. */
const LONG_DESC = 120;

function SheetBlock({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className="sheet-block">
      <div className="sheet-block-title">{title}</div>
      <p className="desc-modal-text">{text}</p>
    </div>
  );
}

/** Ficha técnica del paquete: es el mismo contenido que el SOW usa como fuente. */
function PackageSheetModal({ product, onClose }: { product: ProductDto; onClose: () => void }) {
  const chips = platformChips(product.platform);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          Ficha del paquete — {product.code}
          <button className="modal-close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">
          <div className="desc-modal-title">{product.name}</div>

          <div className="sheet-meta">
            {product.packageTypeName && (
              <span className={`type-pill ${product.isAddOn ? 'addon' : ''}`}>{product.packageTypeName}</span>
            )}
            <span className="muted">
              {product.categoryName} › {product.subcategoryName}
            </span>
            {product.estimatedHours != null && (
              <span className="sheet-hours">
                <Clock size={12} /> {product.estimatedHours} h
              </span>
            )}
          </div>

          {chips.length > 0 && (
            <div className="platform-chips">
              {chips.map((t) => (
                <span className="platform-chip" key={t}>
                  {t}
                </span>
              ))}
            </div>
          )}

          <SheetBlock title="Objetivo" text={product.objective} />
          <SheetBlock title="Alcance" text={product.scope} />
          <SheetBlock title="Prerrequisitos" text={product.prerequisites} />
          <SheetBlock title="No incluido" text={product.exclusions} />

          {product.roleHours.length > 0 && (
            <div className="sheet-block">
              <div className="sheet-block-title">Esfuerzo estimado</div>
              <div className="role-hours-readout">
                {product.roleHours.map((h) => (
                  <span key={h.deliveryRoleId}>
                    <strong>{h.hours} h</strong> {h.roleName}
                  </span>
                ))}
              </div>
            </div>
          )}
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
  const [sheetProduct, setSheetProduct] = useState<ProductDto | null>(null);
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
            <th>Paquete</th>
            <th>Objetivo y alcance</th>
            <th style={{ textAlign: 'right' }}>Horas</th>
            <th style={{ textAlign: 'center' }}>Cantidad</th>
            <th style={{ textAlign: 'right' }}>Costo</th>
          </tr>
        </thead>
        <tbody>
          {pager.pageItems.map((p) => {
            const qty = getQuantity(p.productId);
            // El objetivo resume mejor que el alcance; este último es una lista larga.
            const summary = p.objective ?? p.scope;
            return (
              <tr key={p.productId}>
                <td className="cell-id">{p.code}</td>
                <td>
                  <div className="cell-name">
                    <span className="pkg-icon">
                      {p.isAddOn ? <Puzzle size={15} /> : <Package size={15} />}
                    </span>
                    {p.name}
                    {p.packageTypeName ? (
                      <span className={`type-pill ${p.isAddOn ? 'addon' : ''}`}>{p.packageTypeName}</span>
                    ) : (
                      p.isAddOn && <span className="badge-addon">Add-on</span>
                    )}
                  </div>
                  {p.platform && (
                    <div className="platform-chips">
                      {platformChips(p.platform).map((t) => (
                        <span className="platform-chip" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="cell-desc">
                  <div className="desc-wrap">
                    <span className="desc-clamp">{summary ?? '—'}</span>
                    {(p.objective || p.scope || p.prerequisites || p.exclusions) &&
                      (summary == null || summary.length > LONG_DESC || p.scope != null) && (
                        <button
                          className="desc-more"
                          title="Ver ficha completa del paquete"
                          onClick={() => setSheetProduct(p)}
                        >
                          <Eye size={14} />
                        </button>
                      )}
                  </div>
                </td>
                <td className="cell-hours">
                  {p.estimatedHours == null ? (
                    <span className="muted">—</span>
                  ) : (
                    <span className="hours-total">{p.estimatedHours} h</span>
                  )}
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
      {sheetProduct && <PackageSheetModal product={sheetProduct} onClose={() => setSheetProduct(null)} />}
    </div>
  );
}
