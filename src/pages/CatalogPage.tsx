import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { catalogApi } from '../api/services';
import type { CategoryDto, ProductDto, QuotationDto, SubcategoryDto } from '../types/api';
import { TopBar } from '../components/TopBar';
import { ProductTable } from '../components/ProductTable';
import { StatsBar } from '../components/StatsBar';
import { CartSidebar } from '../components/CartSidebar';
import { ExportModal } from '../components/ExportModal';
import { AppFooter } from '../components/AppFooter';

/** Mínimo de caracteres para buscar: con uno solo la consulta devolvería casi todo el catálogo. */
const MIN_SEARCH = 2;
const SEARCH_DEBOUNCE_MS = 300;

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

  // Lo que el usuario escribe y lo que efectivamente se consulta. Se separan para no disparar
  // una petición por cada tecla.
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const searching = query.length >= MIN_SEARCH;

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // Categorías
  useEffect(() => {
    catalogApi
      .categories()
      .then((cs) => setCategories(cs.filter((c) => c.isActive)))
      .catch(() => setToast({ text: 'Error cargando categorías del API', error: true }));
  }, []);

  // Subcategorías de la categoría activa
  useEffect(() => {
    if (categoryId == null) return;
    setSubcategoryId(null);
    setProducts([]);
    catalogApi
      .subcategories(categoryId)
      .then((ss) => setSubcategories(ss.filter((s) => s.isActive)))
      .catch(() => setToast({ text: 'Error cargando subcategorías', error: true }));
  }, [categoryId]);

  // Productos: o los de la subcategoría activa, o los de la búsqueda global.
  //
  // La búsqueda manda y NO filtra por categoría a propósito: el comercial suele saber el código o
  // el nombre del paquete y no en qué rama del catálogo vive.
  useEffect(() => {
    if (!searching && subcategoryId == null) {
      setProducts([]);
      return;
    }

    // Con el debounce hay varias peticiones en vuelo: sin esta guarda, una respuesta vieja puede
    // pisar a una nueva y dejar en pantalla resultados que no corresponden a lo escrito.
    let cancelled = false;
    setLoadingProducts(true);
    catalogApi
      .products(searching ? { search: query } : { subcategoryId: subcategoryId! })
      .then((ps) => {
        if (!cancelled) setProducts(ps);
      })
      .catch(() => {
        if (!cancelled) setToast({ text: 'Error cargando productos', error: true });
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searching, query, subcategoryId]);

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
    setSearch('');
    setQuery('');
    setCategoryId(null);
    setSubcategoryId(null);
    setProducts([]);
  }

  /** Navegar por el catálogo cierra la búsqueda: son dos formas de llegar a lo mismo. */
  function pickCategory(id: number) {
    clearSearch();
    setCategoryId(id);
  }

  function pickSubcategory(id: number) {
    clearSearch();
    setSubcategoryId(id);
  }

  function clearSearch() {
    setSearch('');
    setQuery('');
  }

  function handleQuotationCreated(q: QuotationDto) {
    setToast({ text: `Cotización ${q.number} creada correctamente` });
  }

  return (
    <div className="app-shell">
      <TopBar
        categories={categories}
        activeId={categoryId}
        onSelect={pickCategory}
        onOpenAdmin={onOpenAdmin}
        onOpenQuotes={onOpenQuotes}
        onOpenIntegrations={onOpenIntegrations}
      />

      <div className="app-body">
        <main>
          <nav className="breadcrumb">
            <a onClick={goHome}>Inicio</a>
            {searching ? (
              <>
                <span>›</span>
                <span>Búsqueda: «{query}»</span>
              </>
            ) : (
              <>
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
              </>
            )}
          </nav>

          {/* Las subcategorías se esconden mientras se busca: sus resultados no son los de la
              búsqueda y tenerlas marcadas al lado de otra lista confunde. */}
          {activeCategory && !searching && (
            <div className="chips">
              {subcategories.map((s) => (
                <button
                  key={s.subcategoryId}
                  className={`chip ${s.subcategoryId === subcategoryId ? 'active' : ''}`}
                  onClick={() => pickSubcategory(s.subcategoryId)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          <div className="catalog-search">
            <Search size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && clearSearch()}
              placeholder="Buscar en todo el catálogo: código, nombre, plataforma, objetivo o alcance…"
              aria-label="Buscar paquetes en todo el catálogo"
            />
            {searching && !loadingProducts && (
              <span className="catalog-search-count">
                {products.length} {products.length === 1 ? 'resultado' : 'resultados'}
              </span>
            )}
            {search && (
              <button className="catalog-search-clear" title="Limpiar búsqueda" onClick={clearSearch}>
                <X size={15} />
              </button>
            )}
          </div>

          <ProductTable
            products={products}
            loading={loadingProducts}
            hasSelection={searching || subcategoryId != null}
            searchTerm={searching ? query : undefined}
          />

          <StatsBar />
        </main>

        <CartSidebar onExport={() => setExportOpen(true)} />
      </div>

      <AppFooter />

      {exportOpen && (
        <ExportModal onClose={() => setExportOpen(false)} onSuccess={handleQuotationCreated} />
      )}

      {toast && <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.text}</div>}
    </div>
  );
}
