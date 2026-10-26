import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { ClientDto } from '../types/api';
import { sinNit } from '../utils/clientes';

/**
 * Selector de cliente con búsqueda. Reemplaza al `<select>` nativo, que desde la carga del
 * CRM tiene ~2.900 opciones y es inusable: no se puede buscar y el navegador pinta todas.
 *
 * Filtra en memoria sobre la lista que ya trae el modal, así que responde sin ir al servidor
 * en cada tecla. Lo que la vuelve usable con esa cantidad de datos son tres cosas:
 *
 *  - Se pintan como máximo MAX_VISIBLE filas. Renderizar 2.900 `<li>` congela el modal.
 *  - El texto de búsqueda se compara sin tildes: el CRM trae "Grupo Éxito" y "GRUPO EXITO"
 *    para la misma empresa, y quien busca escribe cualquiera de las dos.
 *  - Varias palabras se exigen todas, en cualquier orden: "secretaria hacienda" encuentra
 *    "SECRETARIA DISTRITAL DE HACIENDA".
 */
const MAX_VISIBLE = 50;

function plano(v: string) {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

interface Props {
  clients: ClientDto[];
  value: number | '';
  onChange: (clientId: number | '') => void;
  loading?: boolean;
  disabled?: boolean;
}

export function ClientPicker({ clients, value, onChange, loading, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(
    () => clients.find((c) => c.clientId === value) ?? null,
    [clients, value],
  );

  // El texto normalizado se calcula una vez por lista, no en cada tecla. El marcador
  // SIN-NIT-xxxxxxxx queda FUERA del índice: nadie busca un hash, y dejarlo adentro hacía
  // que escribir "sin" devolviera los ~1.000 clientes sin NIT como ruido.
  const indice = useMemo(
    () =>
      clients.map((c) => ({
        c,
        texto: plano(sinNit(c.taxId) ? c.businessName : `${c.businessName} ${c.taxId}`),
      })),
    [clients],
  );

  const coincidencias = useMemo(() => {
    const terminos = plano(query).split(/\s+/).filter(Boolean);
    if (terminos.length === 0) return clients;
    return indice.filter(({ texto }) => terminos.every((t) => texto.includes(t))).map((x) => x.c);
  }, [clients, indice, query]);

  const visibles = useMemo(() => coincidencias.slice(0, MAX_VISIBLE), [coincidencias]);

  // Al abrir, el foco va al buscador y la lista arranca desde el cliente ya elegido.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const i = visibles.findIndex((c) => c.clientId === value);
    setActive(i >= 0 ? i : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escribir mueve el resaltado al primer resultado, o quedaría apuntando a una fila que ya no está.
  useEffect(() => {
    setActive(0);
  }, [query]);

  // Clic afuera cierra. mousedown y no click: si no, elegir una opción cerraría dos veces.
  useEffect(() => {
    if (!open) return;
    function afuera(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', afuera);
    return () => document.removeEventListener('mousedown', afuera);
  }, [open]);

  // El resaltado tiene que seguir visible cuando se navega con las flechas.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('.combo-option.active')?.scrollIntoView({
      block: 'nearest',
    });
  }, [active, visibles]);

  function elegir(c: ClientDto) {
    onChange(c.clientId);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (visibles.length === 0) return;
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + paso + visibles.length) % visibles.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = visibles[active];
      if (c) elegir(c);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  const etiqueta = loading
    ? 'Cargando clientes…'
    : selected
      ? selected.businessName
      : 'Selecciona un cliente';

  return (
    <div className="combo" ref={boxRef}>
      <button
        type="button"
        className={`combo-trigger ${open ? 'open' : ''}`}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? 'combo-valor' : 'combo-placeholder'}>{etiqueta}</span>
        {selected && (
          <span className={`combo-nit ${sinNit(selected.taxId) ? 'pendiente' : ''}`}>
            {sinNit(selected.taxId) ? 'sin NIT' : selected.taxId}
          </span>
        )}
        <ChevronDown size={15} className="combo-caret" />
      </button>

      {open && (
        <div className="combo-panel">
          <div className="combo-search">
            <Search size={14} />
            <input
              ref={inputRef}
              value={query}
              placeholder="Buscar por razón social o NIT…"
              role="combobox"
              aria-controls="combo-clientes"
              aria-expanded
              aria-autocomplete="list"
              aria-activedescendant={visibles[active] ? `combo-opt-${visibles[active].clientId}` : undefined}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
            />
            {query && (
              <button
                type="button"
                className="combo-clear"
                title="Limpiar"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <ul className="combo-list" id="combo-clientes" role="listbox" ref={listRef}>
            {visibles.length === 0 ? (
              <li className="combo-empty">Ningún cliente coincide con “{query}”</li>
            ) : (
              visibles.map((c, i) => (
                <li
                  key={c.clientId}
                  id={`combo-opt-${c.clientId}`}
                  role="option"
                  aria-selected={c.clientId === value}
                  className={`combo-option ${i === active ? 'active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  // Sin esto el botón pierde el foco antes de que corra el onClick.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(c)}
                >
                  <span className="combo-option-nombre">{c.businessName}</span>
                  <span className={`combo-nit ${sinNit(c.taxId) ? 'pendiente' : ''}`}>
                    {sinNit(c.taxId) ? 'sin NIT' : c.taxId}
                  </span>
                  {c.clientId === value && <Check size={14} className="combo-option-check" />}
                </li>
              ))
            )}
          </ul>

          <div className="combo-foot">
            {coincidencias.length > visibles.length
              ? `Mostrando ${visibles.length} de ${coincidencias.length} — afiná la búsqueda`
              : `${coincidencias.length} cliente${coincidencias.length === 1 ? '' : 's'}`}
          </div>
        </div>
      )}
    </div>
  );
}
