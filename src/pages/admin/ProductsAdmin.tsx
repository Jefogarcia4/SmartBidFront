import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Pencil, Ban, Puzzle, X, Link2 } from 'lucide-react';
import { catalogApi } from '../../api/services';
import type { CategoryDto, ProductDto, SubcategoryDto } from '../../types/api';
import { Pagination, usePagination } from '../../components/Pagination';
import { useSettings } from '../../context/SettingsContext';
import { money } from '../../utils/format';

interface Props {
  notify: (text: string, error?: boolean) => void;
}

interface ProductForm {
  id: number | null;
  code: string;
  name: string;
  scope: string;
  subcategoryId: number | '';
  /** Interpretado según el modo: COP directo (defecto) o USD (TRM habilitada) */
  price: string;
  isAddOn: boolean;
  maxQuantity: string;
  isActive: boolean;
}

const EMPTY_FORM: ProductForm = {
  id: null,
  code: '',
  name: '',
  scope: '',
  subcategoryId: '',
  price: '',
  isAddOn: false,
  maxQuantity: '',
  isActive: true,
};

export function ProductsAdmin({ notify }: Props) {
  const { useTrmPricing } = useSettings();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterCat, setFilterCat] = useState<number | ''>('');
  const [filterType, setFilterType] = useState<'' | 'base' | 'addon'>('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<ProductForm | null>(null);
  const [saving, setSaving] = useState(false);
  const pager = usePagination(products, 10);

  // Gestión de add-ons vinculados a un paquete base
  const [addOnsFor, setAddOnsFor] = useState<ProductDto | null>(null);
  const [linked, setLinked] = useState<ProductDto[] | null>(null);
  const [allAddOns, setAllAddOns] = useState<ProductDto[]>([]);
  const [linkSelect, setLinkSelect] = useState<number | ''>('');

  useEffect(() => {
    Promise.all([catalogApi.categories(), catalogApi.subcategories()])
      .then(([cs, ss]) => {
        setCategories(cs);
        setSubcategories(ss);
      })
      .catch(() => notify('Error cargando catálogos', true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      setProducts(
        await catalogApi.products({
          categoryId: filterCat === '' ? undefined : filterCat,
          search: search || undefined,
          isAddOn: filterType === '' ? undefined : filterType === 'addon',
          isActive: null, // admin ve activos e inactivos
        }),
      );
    } catch {
      notify('Error cargando productos', true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCat, filterType]);

  const subcatOptions = useMemo(() => {
    const byCat = new Map<number, SubcategoryDto[]>();
    for (const s of subcategories) {
      const list = byCat.get(s.categoryId) ?? [];
      list.push(s);
      byCat.set(s.categoryId, list);
    }
    return categories.map((c) => ({ category: c, subs: byCat.get(c.categoryId) ?? [] }));
  }, [categories, subcategories]);

  async function saveProduct(e: FormEvent) {
    e.preventDefault();
    if (!form || form.subcategoryId === '') return;
    setSaving(true);
    try {
      const base = {
        name: form.name,
        scope: form.scope || null,
        subcategoryId: Number(form.subcategoryId),
        maxQuantity: form.maxQuantity === '' ? null : Number(form.maxQuantity),
        // El modo de precios decide qué campo viaja al API
        ...(useTrmPricing
          ? { priceUSD: Number(form.price) }
          : { priceCOP: Number(form.price) }),
      };
      if (form.id == null) {
        await catalogApi.createProduct({ ...base, code: form.code, isAddOn: form.isAddOn });
      } else {
        await catalogApi.updateProduct(form.id, { ...base, isActive: form.isActive });
      }
      notify('Producto guardado');
      setForm(null);
      await loadProducts();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error guardando producto', true);
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(p: ProductDto) {
    if (!confirm(`¿Desactivar "${p.name}"? El catálogo lo conserva para histórico (RN-010).`)) return;
    try {
      await catalogApi.deactivateProduct(p.productId);
      notify('Producto desactivado');
      await loadProducts();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error desactivando', true);
    }
  }

  async function openAddOns(p: ProductDto) {
    setAddOnsFor(p);
    setLinked(null);
    setLinkSelect('');
    try {
      const [links, addons] = await Promise.all([
        catalogApi.compatibleAddOns(p.productId),
        catalogApi.products({ isAddOn: true, isActive: null }),
      ]);
      setLinked(links);
      setAllAddOns(addons);
    } catch {
      notify('Error cargando add-ons', true);
      setAddOnsFor(null);
    }
  }

  async function linkAddOn() {
    if (!addOnsFor || linkSelect === '') return;
    try {
      await catalogApi.linkAddOn(addOnsFor.productId, Number(linkSelect));
      setLinked(await catalogApi.compatibleAddOns(addOnsFor.productId));
      setLinkSelect('');
      notify('Add-on vinculado');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error vinculando add-on', true);
    }
  }

  async function unlinkAddOn(addOnId: number) {
    if (!addOnsFor) return;
    try {
      await catalogApi.unlinkAddOn(addOnsFor.productId, addOnId);
      setLinked(await catalogApi.compatibleAddOns(addOnsFor.productId));
      notify('Add-on desvinculado');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error desvinculando add-on', true);
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">Todas las familias</option>
          {categories.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as '' | 'base' | 'addon')}>
          <option value="">Paquetes y add-ons</option>
          <option value="base">Solo paquetes</option>
          <option value="addon">Solo add-ons</option>
        </select>
        <input
          placeholder="Buscar por código o nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void loadProducts()}
          style={{ minWidth: 220 }}
        />
        <button className="icon-btn" title="Buscar" onClick={() => void loadProducts()}>
          🔍
        </button>
        <div className="toolbar-spacer" />
        <button className="btn-add" onClick={() => setForm(EMPTY_FORM)}>
          <Plus size={14} /> Nuevo producto
        </button>
      </div>

      <div className="catalog-card">
        {loading ? (
          <div className="spinner" />
        ) : (
          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Ubicación</th>
                <th style={{ textAlign: 'right' }}>{useTrmPricing ? 'Precio USD' : 'Precio COP'}</th>
                {useTrmPricing && <th style={{ textAlign: 'right' }}>Precio COP (TRM)</th>}
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((p) => (
                <tr key={p.productId}>
                  <td className="cell-id">{p.code}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>
                    <span className={`type-pill ${p.isAddOn ? 'addon' : ''}`}>
                      {p.isAddOn ? 'Add-on' : 'Paquete'}
                    </span>
                  </td>
                  <td className="muted">
                    {p.categoryName} › {p.subcategoryName}
                  </td>
                  <td className="cell-cost">
                    <span className="cost-total">
                      {money(useTrmPricing ? p.priceUSD : p.priceCOP)}
                    </span>
                  </td>
                  {useTrmPricing && (
                    <td className="cell-cost">
                      <span className="cost-unit">{money(p.priceCOP)}</span>
                    </td>
                  )}
                  <td>
                    <span className={`status-pill ${p.isActive ? 'on' : 'off'}`}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title="Editar / precio"
                        onClick={() =>
                          setForm({
                            id: p.productId,
                            code: p.code,
                            name: p.name,
                            scope: p.scope ?? '',
                            subcategoryId: p.subcategoryId,
                            price: String(useTrmPricing ? p.priceUSD : p.priceCOP),
                            isAddOn: p.isAddOn,
                            maxQuantity: p.maxQuantity == null ? '' : String(p.maxQuantity),
                            isActive: p.isActive,
                          })
                        }
                      >
                        <Pencil size={13} />
                      </button>
                      {!p.isAddOn && (
                        <button className="icon-btn" title="Add-ons compatibles" onClick={() => void openAddOns(p)}>
                          <Puzzle size={13} />
                        </button>
                      )}
                      {p.isActive && (
                        <button className="icon-btn danger" title="Desactivar" onClick={() => void deactivate(p)}>
                          <Ban size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && <Pagination pager={pager} />}
      </div>

      {/* --- Modal crear/editar producto --- */}
      {form && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              {form.id == null ? 'Nuevo producto' : `Editar ${form.code}`}
              <button className="modal-close" onClick={() => setForm(null)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={saveProduct}>
              <div className="modal-body">
                <div className="form-row">
                  {form.id == null && (
                    <div className="field">
                      <label>CÓDIGO</label>
                      <input
                        required
                        placeholder="GDD-001"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="field">
                    <label>NOMBRE</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>SUBCATEGORÍA</label>
                  <select
                    required
                    value={form.subcategoryId}
                    onChange={(e) =>
                      setForm({ ...form, subcategoryId: e.target.value === '' ? '' : Number(e.target.value) })
                    }
                  >
                    <option value="">Selecciona…</option>
                    {subcatOptions.map(({ category, subs }) => (
                      <optgroup key={category.categoryId} label={category.name}>
                        {subs.map((s) => (
                          <option key={s.subcategoryId} value={s.subcategoryId}>
                            {s.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>DESCRIPCIÓN / ALCANCE</label>
                  <textarea
                    rows={3}
                    value={form.scope}
                    onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="field">
                    <label>{useTrmPricing ? 'PRECIO BASE (USD)' : 'PRECIO (COP)'}</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>CANTIDAD MÁXIMA (OPCIONAL)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.maxQuantity}
                      onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })}
                    />
                  </div>
                </div>
                {form.id == null ? (
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={form.isAddOn}
                      onChange={(e) => setForm({ ...form, isAddOn: e.target.checked })}
                    />
                    Es un add-on (requiere paquete base)
                  </label>
                ) : (
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    Activo en el catálogo
                  </label>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setForm(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal add-ons de un paquete base --- */}
      {addOnsFor && (
        <div className="modal-overlay" onClick={() => setAddOnsFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              Add-ons de {addOnsFor.code}
              <button className="modal-close" onClick={() => setAddOnsFor(null)}>
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              <div className="muted">{addOnsFor.name}</div>
              {linked === null ? (
                <div className="spinner" />
              ) : linked.length === 0 ? (
                <div className="muted">Sin add-ons vinculados</div>
              ) : (
                linked.map((a) => (
                  <div className="addon-link-row" key={a.productId}>
                    <span>
                      <strong>{a.code}</strong> — {a.name}
                      <span className="muted"> · {money(a.priceCOP)}</span>
                    </span>
                    <button className="icon-btn danger" title="Desvincular" onClick={() => void unlinkAddOn(a.productId)}>
                      <X size={13} />
                    </button>
                  </div>
                ))
              )}
              <div className="admin-toolbar" style={{ marginTop: 6 }}>
                <select
                  value={linkSelect}
                  onChange={(e) => setLinkSelect(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ flex: 1 }}
                >
                  <option value="">Vincular add-on…</option>
                  {allAddOns
                    .filter((a) => !(linked ?? []).some((l) => l.productId === a.productId))
                    .map((a) => (
                      <option key={a.productId} value={a.productId}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                </select>
                <button className="btn-add" onClick={() => void linkAddOn()} disabled={linkSelect === ''}>
                  <Link2 size={14} /> Vincular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
