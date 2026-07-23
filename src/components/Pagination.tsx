import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface Pager<T> {
  pageItems: T[];
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  setPage: (page: number) => void;
}

/** Paginación en cliente: el API devuelve listas completas. */
export function usePagination<T>(items: T[], pageSize = 10): Pager<T> {
  const [page, setPage] = useState(1);

  // Vuelve a la página 1 cuando cambian los datos (filtros, búsqueda, recarga)
  useEffect(() => {
    setPage(1);
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    pageItems,
    page: safePage,
    totalPages,
    total: items.length,
    from: items.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
    to: Math.min(safePage * pageSize, items.length),
    setPage,
  };
}

export function Pagination({ pager }: { pager: Pager<unknown> }) {
  const { page, totalPages, total, from, to, setPage } = pager;
  if (totalPages <= 1) return null;

  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

  return (
    <div className="pagination">
      <span className="pagination-info">
        {from}–{to} de {total}
      </span>
      <div className="pagination-controls">
        <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)} title="Primera">
          <ChevronsLeft size={14} />
        </button>
        <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)} title="Anterior">
          <ChevronLeft size={14} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={`page-btn ${p === page ? 'active' : ''}`}
            onClick={() => setPage(p)}
          >
            {p}
          </button>
        ))}
        <button
          className="page-btn"
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          title="Siguiente"
        >
          <ChevronRight size={14} />
        </button>
        <button
          className="page-btn"
          disabled={page === totalPages}
          onClick={() => setPage(totalPages)}
          title="Última"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}
