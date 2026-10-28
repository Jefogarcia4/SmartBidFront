import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type {
  CatalogCompareResult,
  CatalogCompareRow,
  CatalogCompareSelection,
  CatalogFieldChange,
} from '../../types/api';
import { money } from '../../utils/format';

interface Props {
  comparacion: CatalogCompareResult;
  aplicando: boolean;
  onAplicar: (seleccion: CatalogCompareSelection) => void;
}

/**
 * Resultado de comparar un archivo contra la base: qué cambia producto por producto, y casillas
 * para elegir qué aplicar.
 *
 * Nada viene marcado: se aplica solo lo que el administrador elige. Un archivo editado a mano
 * puede traer una columna rota, y con todo marcado por defecto un clic la cargaría entera.
 * Para el caso común —aceptar una lista de precios nueva— cada grupo tiene "Marcar todos".
 */
export function CatalogCompare({ comparacion: c, aplicando, onAplicar }: Props) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [retirar, setRetirar] = useState<Set<string>>(new Set());
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  // Una comparación nueva (otro archivo, o la de después de aplicar) arranca sin nada marcado.
  useEffect(() => {
    setMarcados(new Set());
    setRetirar(new Set());
    setAbiertos(new Set());
  }, [c]);

  const nMod = useMemo(() => c.changed.filter((r) => marcados.has(r.code)).length, [c, marcados]);
  const nNuevos = useMemo(() => c.new.filter((r) => marcados.has(r.code)).length, [c, marcados]);
  const total = nMod + nNuevos + retirar.size;

  const alternar = (conjunto: Set<string>, set: (s: Set<string>) => void, code: string) => {
    const s = new Set(conjunto);
    if (s.has(code)) s.delete(code);
    else s.add(code);
    set(s);
  };

  if (c.changed.length + c.new.length + c.missing.length === 0) {
    return (
      <>
        <Cifras c={c} />
        <div className="cmp-igual">
          <CheckCircle2 size={18} /> El archivo coincide con la base: no hay nada para aplicar.
        </div>
      </>
    );
  }

  return (
    <>
      <Cifras c={c} />

      <Grupo
        titulo="Modificados"
        descripcion="Se escriben solo los campos que cambian; el resto del producto queda como está."
        filas={c.changed}
        seleccion={marcados}
        onSeleccion={setMarcados}
        render={(r) => (
          <Fila
            key={r.code}
            r={r}
            marcado={marcados.has(r.code)}
            onMarcar={() => alternar(marcados, setMarcados, r.code)}
          >
            {r.changes.map((ch) => (
              <Cambio
                key={ch.field}
                ch={ch}
                abierto={abiertos.has(`${r.code}|${ch.field}`)}
                onVer={() => alternar(abiertos, setAbiertos, `${r.code}|${ch.field}`)}
              />
            ))}
          </Fila>
        )}
      />

      <Grupo
        titulo="Nuevos"
        descripcion="No existen en la base. Se crean con todo lo que trae el archivo."
        filas={c.new}
        seleccion={marcados}
        onSeleccion={setMarcados}
        render={(r) => (
          <Fila
            key={r.code}
            r={r}
            marcado={marcados.has(r.code)}
            onMarcar={() => alternar(marcados, setMarcados, r.code)}
            conMeta
          />
        )}
      />

      <Grupo
        titulo="No vienen en el archivo"
        descripcion="Activos de las mismas familias y series que el archivo. No se tocan salvo que los marques: se desactivan, nunca se borran."
        etiquetaMarca="Desactivar"
        filas={c.missing}
        seleccion={retirar}
        onSeleccion={setRetirar}
        render={(r) => (
          <Fila
            key={r.code}
            r={r}
            marcado={retirar.has(r.code)}
            onMarcar={() => alternar(retirar, setRetirar, r.code)}
            conMeta
          />
        )}
      />

      <div className="cmp-aplicar">
        <span className="muted">
          {nMod} modificado{nMod === 1 ? '' : 's'} · {nNuevos} nuevo{nNuevos === 1 ? '' : 's'} ·{' '}
          {retirar.size} a desactivar
        </span>
        <button
          className="btn-primary"
          disabled={total === 0 || !c.canApply || aplicando}
          onClick={() => onAplicar({ apply: [...marcados], deactivate: [...retirar] })}
        >
          {aplicando ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
          Aplicar {total} cambio{total === 1 ? '' : 's'}
        </button>
      </div>
    </>
  );
}

function Cifras({ c }: { c: CatalogCompareResult }) {
  return (
    <>
      <div className="import-cifras">
        <div className={c.changed.length > 0 ? 'ok' : ''}>
          <b>{c.changed.length}</b>
          <span>modificados</span>
        </div>
        <div className={c.new.length > 0 ? 'ok' : ''}>
          <b>{c.new.length}</b>
          <span>nuevos</span>
        </div>
        <div className={c.missing.length > 0 ? 'warn' : ''}>
          <b>{c.missing.length}</b>
          <span>no vienen</span>
        </div>
        <div>
          <b>{c.unchanged}</b>
          <span>sin cambios</span>
        </div>
      </div>
      <p className="cmp-campos muted">Se comparan: {c.comparedFields.join(' · ')}</p>
    </>
  );
}

interface GrupoProps {
  titulo: string;
  descripcion: string;
  etiquetaMarca?: string;
  filas: CatalogCompareRow[];
  seleccion: Set<string>;
  onSeleccion: (s: Set<string>) => void;
  render: (r: CatalogCompareRow) => ReactNode;
}

function Grupo({ titulo, descripcion, etiquetaMarca, filas, seleccion, onSeleccion, render }: GrupoProps) {
  if (filas.length === 0) return null;

  // Las bloqueadas no cuentan para "marcar todos": no se pueden aplicar.
  const elegibles = filas.filter((r) => !r.blocked).map((r) => r.code);
  const todos = elegibles.length > 0 && elegibles.every((code) => seleccion.has(code));

  const marcarTodos = () => {
    const s = new Set(seleccion);
    for (const code of elegibles) {
      if (todos) s.delete(code);
      else s.add(code);
    }
    onSeleccion(s);
  };

  return (
    <div className="cmp-grupo">
      <div className="cmp-grupo-head">
        <div>
          <div className="import-sub" style={{ margin: 0 }}>
            {titulo} ({filas.length})
          </div>
          <small className="muted">{descripcion}</small>
        </div>
        {elegibles.length > 0 && (
          <label className="cmp-todos">
            <input type="checkbox" checked={todos} onChange={marcarTodos} />
            {etiquetaMarca ? `${etiquetaMarca} todos` : 'Marcar todos'}
          </label>
        )}
      </div>
      {filas.map(render)}
    </div>
  );
}

interface FilaProps {
  r: CatalogCompareRow;
  marcado: boolean;
  onMarcar: () => void;
  /** Muestra familia, subcategoría y precio: para nuevos y faltantes, que no traen cambios. */
  conMeta?: boolean;
  children?: ReactNode;
}

function Fila({ r, marcado, onMarcar, conMeta, children }: FilaProps) {
  return (
    <div className={`cmp-fila ${r.blocked ? 'bloqueada' : ''} ${marcado ? 'marcada' : ''}`}>
      <input
        type="checkbox"
        className="cmp-check"
        checked={marcado}
        disabled={!!r.blocked}
        onChange={onMarcar}
        aria-label={`Marcar ${r.code}`}
      />
      <div className="cmp-cuerpo">
        <div className="cmp-titulo">
          <span className="cell-id">{r.code}</span>
          <strong>{r.name}</strong>
          {r.isAddOn && <span className="type-pill addon">Add-on</span>}
          {r.quoted && <span className="status-pill warn">Cotizado</span>}
        </div>
        {conMeta && (
          <div className="cmp-meta muted">
            {r.category} › {r.subcategory} · {money(r.priceCOP)}
          </div>
        )}
        {children}
        {r.warning && (
          <div className="cmp-nota aviso">
            <AlertTriangle size={13} /> {r.warning}
          </div>
        )}
        {r.blocked && (
          <div className="cmp-nota bloquea">
            <XCircle size={13} /> {r.blocked}
          </div>
        )}
      </div>
    </div>
  );
}

function Valor({ ch, v }: { ch: CatalogFieldChange; v: string | null }) {
  if (v == null || v === '') return <em className="cmp-vacio">vacío</em>;
  if (ch.kind === 'money') return <>{money(Number(v))}</>;
  return <>{v}</>;
}

function Cambio({ ch, abierto, onVer }: { ch: CatalogFieldChange; abierto: boolean; onVer: () => void }) {
  return (
    <>
      <div className="cmp-cambio">
        <span className="cmp-campo">{ch.field}</span>
        {ch.kind === 'longtext' ? (
          <button type="button" className="cmp-ver" onClick={onVer}>
            {abierto ? 'ocultar' : 'ver cambios'}
          </button>
        ) : (
          <>
            <span className="cmp-antes">
              <Valor ch={ch} v={ch.before} />
            </span>
            <ArrowRight size={12} className="cmp-flecha" />
            <span className="cmp-despues">
              <Valor ch={ch} v={ch.after} />
            </span>
          </>
        )}
      </div>
      {abierto && <DiffTexto antes={ch.before} despues={ch.after} />}
    </>
  );
}

type LineaDiff = { tipo: 'igual' | 'quita' | 'agrega'; texto: string };

/**
 * Diferencia por líneas (subsecuencia común más larga). Los alcances tienen decenas de líneas
 * y suele cambiar una o dos: mostrar los dos textos enteros lado a lado obliga a buscarlas.
 */
function diffLineas(antes: string | null, despues: string | null): LineaDiff[] {
  const x = antes ? antes.split('\n') : [];
  const y = despues ? despues.split('\n') : [];
  const n = x.length;
  const m = y.length;
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);

  const out: LineaDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      out.push({ tipo: 'igual', texto: x[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push({ tipo: 'quita', texto: x[i++] });
    else out.push({ tipo: 'agrega', texto: y[j++] });
  }
  while (i < n) out.push({ tipo: 'quita', texto: x[i++] });
  while (j < m) out.push({ tipo: 'agrega', texto: y[j++] });
  return out;
}

function DiffTexto({ antes, despues }: { antes: string | null; despues: string | null }) {
  const lineas = useMemo(() => diffLineas(antes, despues), [antes, despues]);
  return (
    <div className="cmp-diff">
      {lineas.map((l, k) => (
        <div key={k} className={`cmp-linea ${l.tipo}`}>
          <span className="cmp-signo">{l.tipo === 'quita' ? '−' : l.tipo === 'agrega' ? '+' : ' '}</span>
          {l.texto || ' '}
        </div>
      ))}
    </div>
  );
}
