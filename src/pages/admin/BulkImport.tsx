import { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { catalogImportApi } from '../../api/services';
import { ADDON_STRATEGIES } from '../../types/api';
import type {
  CatalogImportOptions,
  CatalogImportPreview,
  CatalogImportResult,
} from '../../types/api';
import { money } from '../../utils/format';

interface BulkImportProps {
  notify: (text: string, error?: boolean) => void;
}

/**
 * Carga masiva del catálogo desde una plantilla de Excel o CSV.
 *
 * El flujo es deliberadamente de dos pasos: primero una vista previa que simula la carga
 * completa sin tocar la base, y recién con eso a la vista se habilita el botón de aplicar.
 * Las plantillas que cargamos en octubre de 2026 fallaron las cuatro de formas distintas y
 * ninguna gritó —columnas corridas, códigos reutilizados para otro paquete, add-ons que quedan
 * sueltos—, así que ver el diagnóstico antes de escribir es la función principal de esta
 * pantalla, no un adorno.
 */
export function BulkImport({ notify }: BulkImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [hojas, setHojas] = useState<string[]>([]);
  const [hoja, setHoja] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const [estrategia, setEstrategia] = useState<string>(ADDON_STRATEGIES[0].id);
  const [crearTipos, setCrearTipos] = useState(false);
  const [resoluciones, setResoluciones] = useState<Record<string, string>>({});

  const [previa, setPrevia] = useState<CatalogImportPreview | null>(null);
  const [resultado, setResultado] = useState<CatalogImportResult | null>(null);
  const [cargando, setCargando] = useState<'previa' | 'aplicar' | null>(null);

  const opciones = (): CatalogImportOptions => ({
    sheet: hoja || null,
    prefix: prefijo.trim() || null,
    addOnStrategy: estrategia,
    createMissingTypes: crearTipos,
    solutionMap: Object.keys(resoluciones).length > 0 ? resoluciones : undefined,
  });

  function limpiar() {
    setArchivo(null);
    setHojas([]);
    setHoja('');
    setPrevia(null);
    setResultado(null);
    setResoluciones({});
    if (inputRef.current) inputRef.current.value = '';
  }

  async function elegir(f: File | null) {
    limpiar();
    if (!f) return;
    setArchivo(f);
    try {
      const hs = await catalogImportApi.hojas(f);
      setHojas(hs);
      setHoja(hs[0] ?? '');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo leer el archivo', true);
    }
  }

  async function verPrevia() {
    if (!archivo) return;
    setCargando('previa');
    setResultado(null);
    try {
      setPrevia(await catalogImportApi.previa(archivo, opciones()));
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error analizando la plantilla', true);
    } finally {
      setCargando(null);
    }
  }

  async function aplicar() {
    if (!archivo || !previa?.canApply) return;
    setCargando('aplicar');
    try {
      const r = await catalogImportApi.aplicar(archivo, opciones());
      setResultado(r);
      setPrevia(null);
      notify(`Catálogo actualizado: ${r.inserted} nuevos, ${r.updated} actualizados.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error aplicando la carga', true);
    } finally {
      setCargando(null);
    }
  }

  const bloqueantes = previa?.issues.filter((i) => i.blocking) ?? [];
  const avisos = previa?.issues.filter((i) => !i.blocking) ?? [];

  return (
    <div className="import-wrap">
      {/* ---------- 1. archivo y opciones ---------- */}
      <section className="catalog-card">
        <div className="panel-title">1 · Plantilla</div>

        <label
          className={`dropzone ${archivo ? 'con-archivo' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void elegir(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => void elegir(e.target.files?.[0] ?? null)}
          />
          {archivo ? (
            <>
              <FileSpreadsheet size={26} />
              <div>
                <strong>{archivo.name}</strong>
                <small>{(archivo.size / 1024).toFixed(0)} KB</small>
              </div>
            </>
          ) : (
            <>
              <Upload size={26} />
              <div>
                <strong>Arrastrá la plantilla o hacé clic</strong>
                <small>Excel (.xlsx) o CSV, hasta 10 MB</small>
              </div>
            </>
          )}
        </label>

        {archivo && (
          <div className="import-opts">
            {hojas.length > 1 && (
              <label>
                Hoja
                <select value={hoja} onChange={(e) => setHoja(e.target.value)}>
                  {hojas.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Prefijo de código
              <input
                value={prefijo}
                onChange={(e) => setPrefijo(e.target.value.toUpperCase())}
                placeholder="GVCF, GVB…"
              />
              <small>Solo si la plantilla no trae su propio código.</small>
            </label>

            <label className="ancho">
              De qué base cuelga cada add-on
              <select value={estrategia} onChange={(e) => setEstrategia(e.target.value)}>
                {ADDON_STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <small>La plantilla no trae matriz de compatibilidad; esto es una inferencia.</small>
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={crearTipos}
                onChange={(e) => setCrearTipos(e.target.checked)}
              />
              Crear los tipos de paquete que la plantilla estrene
            </label>

            <div className="import-acciones">
              <button className="btn-primary" onClick={() => void verPrevia()} disabled={cargando !== null}>
                {cargando === 'previa' ? <Loader2 size={15} className="spin" /> : <FileSpreadsheet size={15} />}
                Analizar
              </button>
              <button className="btn-secondary" onClick={limpiar} disabled={cargando !== null}>
                <X size={15} /> Quitar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ---------- 2. diagnóstico ---------- */}
      {previa && (
        <section className="catalog-card">
          <div className="panel-title">
            2 · Qué va a pasar
            <span className="muted"> — {previa.fileName} · hoja {previa.sheet}</span>
          </div>

          <div className="import-cifras">
            <div>
              <b>{previa.packages}</b>
              <span>paquetes</span>
            </div>
            <div>
              <b>{previa.addOns}</b>
              <span>add-ons</span>
            </div>
            <div className="ok">
              <b>{previa.toInsert}</b>
              <span>nuevos</span>
            </div>
            <div>
              <b>{previa.toUpdate}</b>
              <span>se actualizan</span>
            </div>
            <div className={previa.toRemove > 0 ? 'warn' : ''}>
              <b>{previa.toRemove}</b>
              <span>se retiran</span>
            </div>
            <div className="total">
              <b>{money(previa.totalCOP)}</b>
              <span>valor de la plantilla</span>
            </div>
          </div>

          {(previa.newCategories.length > 0 ||
            previa.newSubcategories.length > 0 ||
            previa.newPackageTypes.length > 0) && (
            <div className="import-nuevos">
              {previa.newCategories.length > 0 && (
                <p>
                  <strong>Familias nuevas:</strong> {previa.newCategories.join(', ')}
                </p>
              )}
              {previa.newSubcategories.length > 0 && (
                <p>
                  <strong>Subcategorías nuevas ({previa.newSubcategories.length}):</strong>{' '}
                  {previa.newSubcategories.join(' · ')}
                </p>
              )}
              {previa.newPackageTypes.length > 0 && (
                <p>
                  <strong>Tipos de paquete nuevos:</strong> {previa.newPackageTypes.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Clasificaciones sin decidir: se resuelven acá mismo y se vuelve a analizar. */}
          {previa.ambiguities.length > 0 && (
            <div className="import-ambiguas">
              <div className="import-ambiguas-head">
                <AlertTriangle size={16} /> La plantilla deja la clasificación sin decidir
              </div>
              {previa.ambiguities.map((a) => (
                <div className="import-ambigua" key={a.value}>
                  <code>{a.value}</code>
                  <small>{a.rows} fila(s)</small>
                  <select
                    value={resoluciones[a.value] ?? ''}
                    onChange={(e) =>
                      setResoluciones({ ...resoluciones, [a.value]: e.target.value })
                    }
                  >
                    <option value="">Elegí una…</option>
                    {a.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                className="btn-primary"
                onClick={() => void verPrevia()}
                disabled={previa.ambiguities.some((a) => !resoluciones[a.value])}
              >
                Volver a analizar
              </button>
            </div>
          )}

          {bloqueantes.map((p, i) => (
            <div className="import-issue bloquea" key={`b${i}`}>
              <XCircle size={16} />
              <div>
                {p.message}
                {p.detail && <small>{p.detail}</small>}
              </div>
            </div>
          ))}

          {avisos.map((p, i) => (
            <div className="import-issue aviso" key={`a${i}`}>
              <AlertTriangle size={16} />
              <div>
                {p.message}
                {p.detail && <small>{p.detail}</small>}
              </div>
            </div>
          ))}

          {previa.sample.length > 0 && (
            <>
              <div className="import-sub">Muestra de las primeras filas</div>
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Paquete</th>
                    <th>Tipo</th>
                    <th>Familia › Subcategoría</th>
                    <th style={{ textAlign: 'right' }}>Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {previa.sample.map((r) => (
                    <tr key={r.code}>
                      <td className="cell-id">{r.code}</td>
                      <td>{r.name}</td>
                      <td>
                        {r.packageType && (
                          <span className={`type-pill ${r.isAddOn ? 'addon' : ''}`}>
                            {r.packageType}
                          </span>
                        )}
                      </td>
                      <td className="muted">
                        {r.category} › {r.subcategory}
                      </td>
                      <td style={{ textAlign: 'right' }}>{money(r.priceCOP)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="import-acciones final">
            <button
              className="btn-primary"
              onClick={() => void aplicar()}
              disabled={!previa.canApply || cargando !== null}
            >
              {cargando === 'aplicar' ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
              Aplicar al catálogo
            </button>
            {!previa.canApply && (
              <span className="muted">Resolvé lo que está en rojo para habilitar la carga.</span>
            )}
          </div>
        </section>
      )}

      {/* ---------- 3. resultado ---------- */}
      {resultado && (
        <section className="catalog-card">
          <div className="panel-title">
            <CheckCircle2 size={16} /> Catálogo actualizado
          </div>
          <div className="import-cifras">
            <div className="ok">
              <b>{resultado.inserted}</b>
              <span>insertados</span>
            </div>
            <div>
              <b>{resultado.updated}</b>
              <span>actualizados</span>
            </div>
            <div>
              <b>{resultado.removed}</b>
              <span>eliminados</span>
            </div>
            <div className={resultado.deactivated > 0 ? 'warn' : ''}>
              <b>{resultado.deactivated}</b>
              <span>desactivados</span>
            </div>
            <div>
              <b>{resultado.addOnLinks}</b>
              <span>vínculos add-on</span>
            </div>
            <div className="total">
              <b>{money(resultado.totalCOP)}</b>
              <span>valor cargado</span>
            </div>
          </div>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Los paquetes que ya estaban cotizados y la plantilla dejó de traer no se borran: se
            desactivan, para que el histórico conserve a qué apuntaba cada cotización.
          </p>
        </section>
      )}
    </div>
  );
}
