import { useEffect, useMemo, useState } from 'react';
import { catalogApi } from '../api/services';
import type { CategoryDto, ProductDto, QuotationDto, SubcategoryDto } from '../types/api';
import { TopBar } from '../components/TopBar';
import { ProductTable } from '../components/ProductTable';
import { StatsBar } from '../components/StatsBar';
import { CartSidebar } from '../components/CartSidebar';
import { ExportModal } from '../components/ExportModal';

interface CatalogPageProps {
  onOpenAdmin?: () => void;
  onOpenQuotes?: () => void;
  onOpenIntegrations?: () => void;
}

export function CatalogPage({ onOpenAdmin, onOpenQuotes, onOpenIntegrations }: CatalogPageProps) {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  // Familias (categorías)
  useEffect(() => {
    catalogApi
      .categories()
      .then((cs) => setCategories(cs.filter((c) => c.isActive)))
      .catch(() => setToast({ text: 'Error cargando categorías del API', error: true }));
  }, []);

  // Subcategorías de la familia activa
  useEffect(() => {
    if (categoryId == null) return;
    setSubcategoryId(null);
    setProducts([]);
    catalogApi
      .subcategories(categoryId)
      .then((ss) => setSubcategories(ss.filter((s) => s.isActive)))
      .catch(() => setToast({ text: 'Error cargando subcategorías', error: true }));
  }, [categoryId]);

  // Productos de la subcategoría activa
  useEffect(() => {
    if (subcategoryId == null) return;
    setLoadingProducts(true);
    catalogApi
      .products({ subcategoryId })
      .then(setProducts)
      .catch(() => setToast({ text: 'Error cargando productos', error: true }))
      .finally(() => setLoadingProducts(false));
  }, [subcategoryId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.categoryId === categoryId) ?? null,
    [categories, categoryId],
  );
  const activeSubcategory = useMemo(
    () => subcategories.find((s) => s.subcategoryId === subcategoryId) ?? null,
    [subcategories, subcategoryId],
  );

  function goHome() {
    setCategoryId(null);
    setSubcategoryId(null);
    setProducts([]);
  }

  function handleQuotationCreated(q: QuotationDto) {
    setToast({ text: `Cotización ${q.number} creada correctamente` });
  }

  return (
    <div className="app-shell">
      <TopBar
        categories={categories}
        activeId={categoryId}
        onSelect={setCategoryId}
        onOpenAdmin={onOpenAdmin}
        onOpenQuotes={onOpenQuotes}
        onOpenIntegrations={onOpenIntegrations}
      />

      <div className="app-body">
        <main>
          <nav className="breadcrumb">
            <a onClick={goHome}>Inicio</a>
            {activeCategory && (
              <>
                <span>›</span>
                <a onClick={() => setSubcategoryId(null)}>{activeCategory.name}</a>
              </>
            )}
            {activeSubcategory && (
              <>
                <span>›</span>
                <span>{activeSubcategory.name}</span>
              </>
            )}
          </nav>

          {activeCategory && (
            <div className="chips">
              {subcategories.map((s) => (
                <button
                  key={s.subcategoryId}
                  className={`chip ${s.subcategoryId === subcategoryId ? 'active' : ''}`}
                  onClick={() => setSubcategoryId(s.subcategoryId)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          <ProductTable
            products={products}
            loading={loadingProducts}
            hasSelection={subcategoryId != null}
          />

          <StatsBar />
        </main>

        <CartSidebar onExport={() => setExportOpen(true)} />
      </div>

      <footer className="app-footer">SmartBid © 2026 | Enterprise Marketplace Solution</footer>

      {exportOpen && (
        <ExportModal onClose={() => setExportOpen(false)} onSuccess={handleQuotationCreated} />
      )}

      {toast && <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.text}</div>}
    </div>
  );
}
