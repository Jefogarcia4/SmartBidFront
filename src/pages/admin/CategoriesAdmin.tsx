import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import { catalogApi } from '../../api/services';
import type { CategoryDto, SubcategoryDto } from '../../types/api';
import { Pagination, usePagination } from '../../components/Pagination';

interface Props {
  notify: (text: string, error?: boolean) => void;
}

interface CategoryForm {
  id: number | null;
  name: string;
  icon: string;
  description: string;
  isActive: boolean;
}

interface SubcategoryForm {
  id: number | null;
  name: string;
  description: string;
  isActive: boolean;
}

export function CategoriesAdmin({ notify }: Props) {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryDto[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [catForm, setCatForm] = useState<CategoryForm | null>(null);
  const [subForm, setSubForm] = useState<SubcategoryForm | null>(null);
  const [saving, setSaving] = useState(false);
  const catPager = usePagination(categories, 8);
  const subPager = usePagination(subcategories, 8);

  async function loadCategories() {
    try {
      setCategories(await catalogApi.categories());
    } catch {
      notify('Error cargando categorías', true);
    }
  }

  async function loadSubcategories(categoryId: number) {
    try {
      setSubcategories(await catalogApi.subcategories(categoryId));
    } catch {
      notify('Error cargando subcategorías', true);
    }
  }

  useEffect(() => {
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCat != null) void loadSubcategories(selectedCat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCat]);

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    if (!catForm) return;
    setSaving(true);
    try {
      if (catForm.id == null) {
        await catalogApi.createCategory({
          name: catForm.name,
          icon: catForm.icon || null,
          description: catForm.description || null,
        });
      } else {
        await catalogApi.updateCategory(catForm.id, {
          name: catForm.name,
          icon: catForm.icon || null,
          description: catForm.description || null,
          isActive: catForm.isActive,
        });
      }
      notify('Categoría guardada');
      setCatForm(null);
      await loadCategories();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error guardando categoría', true);
    } finally {
      setSaving(false);
    }
  }

  async function saveSubcategory(e: FormEvent) {
    e.preventDefault();
    if (!subForm || selectedCat == null) return;
    setSaving(true);
    try {
      if (subForm.id == null) {
        await catalogApi.createSubcategory({
          categoryId: selectedCat,
          name: subForm.name,
          description: subForm.description || null,
        });
      } else {
        await catalogApi.updateSubcategory(subForm.id, {
          name: subForm.name,
          description: subForm.description || null,
          isActive: subForm.isActive,
        });
      }
      notify('Subcategoría guardada');
      setSubForm(null);
      await loadSubcategories(selectedCat);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error guardando subcategoría', true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-grid-2">
      {/* --- Categorías --- */}
      <div className="catalog-card">
        <div className="panel-title">
          Categorías
          <button
            className="btn-add"
            onClick={() =>
              setCatForm({ id: null, name: '', icon: '', description: '', isActive: true })
            }
          >
            <Plus size={14} /> Nueva
          </button>
        </div>
        <table className="product-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Icono</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {catPager.pageItems.map((c) => (
              <tr
                key={c.categoryId}
                style={{
                  cursor: 'pointer',
                  background: c.categoryId === selectedCat ? '#f3edff' : undefined,
                }}
                onClick={() => setSelectedCat(c.categoryId)}
              >
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td className="muted">{c.icon ?? '—'}</td>
                <td>
                  <span className={`status-pill ${c.isActive ? 'on' : 'off'}`}>
                    {c.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <button
                    className="icon-btn"
                    title="Editar"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCatForm({
                        id: c.categoryId,
                        name: c.name,
                        icon: c.icon ?? '',
                        description: c.description ?? '',
                        isActive: c.isActive,
                      });
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pager={catPager} />
      </div>

      {/* --- Subcategorías de la categoría seleccionada --- */}
      <div className="catalog-card">
        <div className="panel-title">
          Subcategorías{' '}
          {selectedCat != null
            ? `· ${categories.find((c) => c.categoryId === selectedCat)?.name ?? ''}`
            : ''}
          <button
            className="btn-add"
            disabled={selectedCat == null}
            style={selectedCat == null ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            onClick={() => setSubForm({ id: null, name: '', description: '', isActive: true })}
          >
            <Plus size={14} /> Nueva
          </button>
        </div>
        {selectedCat == null ? (
          <div className="empty-state" style={{ padding: '40px 16px' }}>
            Selecciona una categoría para ver sus subcategorías
          </div>
        ) : (
          <table className="product-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {subPager.pageItems.map((s) => (
                <tr key={s.subcategoryId}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>
                    <span className={`status-pill ${s.isActive ? 'on' : 'off'}`}>
                      {s.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      title="Editar"
                      onClick={() =>
                        setSubForm({
                          id: s.subcategoryId,
                          name: s.name,
                          description: s.description ?? '',
                          isActive: s.isActive,
                        })
                      }
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {selectedCat != null && <Pagination pager={subPager} />}
      </div>

      {/* --- Modal categoría --- */}
      {catForm && (
        <div className="modal-overlay" onClick={() => setCatForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {catForm.id == null ? 'Nueva categoría' : 'Editar categoría'}
              <button className="modal-close" onClick={() => setCatForm(null)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={saveCategory}>
              <div className="modal-body">
                <div className="field">
                  <label>NOMBRE</label>
                  <input
                    required
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>ICONO (server, tasks, users, robot, shield)</label>
                  <input
                    value={catForm.icon}
                    onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>DESCRIPCIÓN</label>
                  <textarea
                    rows={2}
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  />
                </div>
                {catForm.id != null && (
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={catForm.isActive}
                      onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })}
                    />
                    Activa
                  </label>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setCatForm(null)}>
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

      {/* --- Modal subcategoría --- */}
      {subForm && (
        <div className="modal-overlay" onClick={() => setSubForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {subForm.id == null ? 'Nueva subcategoría' : 'Editar subcategoría'}
              <button className="modal-close" onClick={() => setSubForm(null)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={saveSubcategory}>
              <div className="modal-body">
                <div className="field">
                  <label>NOMBRE</label>
                  <input
                    required
                    value={subForm.name}
                    onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>DESCRIPCIÓN</label>
                  <textarea
                    rows={2}
                    value={subForm.description}
                    onChange={(e) => setSubForm({ ...subForm, description: e.target.value })}
                  />
                </div>
                {subForm.id != null && (
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={subForm.isActive}
                      onChange={(e) => setSubForm({ ...subForm, isActive: e.target.checked })}
                    />
                    Activa
                  </label>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSubForm(null)}>
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
    </div>
  );
}
