import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GitCompareArrows,
  Loader2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { catalogApi, catalogImportApi } from '../../api/services';
import { ADDON_STRATEGIES } from '../../types/api';
import type {
  CatalogCompareApplyResult,
  CatalogCompareResult,
  CatalogCompareSelection,
  CatalogImportAmbiguity,
  CatalogImportIssue,
  CatalogImportOptions,
  CatalogImportPreview,
  CatalogImportResult,
  CategoryDto,
} from '../../types/api';
import { money } from '../../utils/format';
import { guardarArchivo } from '../../utils/download';
import { CatalogCompare } from './CatalogCompare';

interface BulkImportProps {
  notify: (text: string, error?: boolean) => void;
}

/**
 * Carga masiva del catálogo desde una plantilla de Excel o CSV.
 *
 * Dos caminos para un mismo archivo:
 *
 *  - **Analizar → Aplicar**: la carga completa de una plantilla del negocio. Reemplaza la serie
 *    entera, así que primero una vista previa que la simula sin tocar la base. Las plantillas
 *    que cargamos en octubre de 2026 fallaron las cuatro de formas distintas y ninguna gritó
 *    —columnas corridas, códigos reutilizados, add-ons sueltos—: ver el diagnóstico antes de
 *    escribir es la función principal de esta pantalla, no un adorno.
 *  - **Comparar con la base**: qué cambia producto por producto, y se aplica solo lo marcado.
 *    Es el camino del ciclo exportar → editar en Excel → volver a subir.
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
  const [comparacion, setComparacion] = useState<CatalogCompareResult | null>(null);
  const [aplicadoComp, setAplicadoComp] = useState<CatalogCompareApplyResult | null>(null);
  const [cargando, setCargando] = useState<'previa' | 'aplicar' | 'comparar' | 'aplicarComp' | null>(
    null,
  );

  const [familias, setFamilias] = useState<CategoryDto[]>([]);
  const [familiaExport, setFamiliaExport] = useState('');
  const [conInactivos, setConInactivos] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    catalogApi
      .categories()
      .then((cs) => setFamilias([...cs].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => notify('No se pudieron cargar las familias para exportar', true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setComparacion(null);
    setAplicadoComp(null);
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

  async function exportar() {
    setExportando(true);
    try {
      const id = familiaExport ? Number(familiaExport) : null;
      const blob = await catalogImportApi.exportar(id, conInactivos);
      // El nombre se arma acá: el header Content-Disposition no llega al front por CORS.
      const familia = id == null ? 'Completo' : familias.find((f) => f.categoryId === id)?.name ?? 'Familia';
      const hoy = new Date();
      const fecha = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
      const slug = familia.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
      guardarArchivo(blob, `Catalogo_SmartBid_${slug}_${fecha}.xlsx`);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo exportar el catálogo', true);
    } finally {
      setExportando(false);
    }
  }

  async function verPrevia() {
    if (!archivo) return;
    setCargando('previa');
    setResultado(null);
    setComparacion(null);
    setAplicadoComp(null);
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

  /** @param conservarAplicado tras aplicar se vuelve a comparar sin borrar el resumen de lo aplicado. */
  async function comparar(conservarAplicado = false) {
    if (!archivo) return;
    setCargando('comparar');
    setPrevia(null);
    setResultado(null);
    if (!conservarAplicado) setAplicadoComp(null);
    try {
      setComparacion(await catalogImportApi.comparar(archivo, opciones()));
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error comparando el archivo', true);
    } finally {
      setCargando(null);
    }
  }

  async function aplicarComparacion(seleccion: CatalogCompareSelection) {
    if (!archivo) return;
    setCargando('aplicarComp');
    try {
      const r = await catalogImportApi.aplicarComparacion(archivo, opciones(), seleccion);
      setAplicadoComp(r);
      notify(
        `Aplicado: ${r.updated} actualizados, ${r.inserted} nuevos, ${r.deactivated} desactivados.`,
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error aplicando los cambios', true);
      setCargando(null);
      return;
    }
    // Se vuelve a comparar para que quede a la vista lo que todavía difiere (lo no marcado).
    await comparar(true);
  }

  return (
    <div className="import-wrap">
      {/* ---------- exportar ---------- */}
      <section className="catalog-card">
        <div className="panel-title">Exportar catálogo</div>
        <p className="muted import-intro">
          Bajá el catálogo a Excel, ajustalo y subilo abajo con <strong>Comparar con la base</strong>:
          vas a ver qué cambia producto por producto y aplicar solo lo que marques. También sirve
          de respaldo: comparar un export viejo deshace los cambios posteriores.
        </p>
        <div className="import-opts">
          <label>
            Familia
            <select value={familiaExport} onChange={(e) => setFamiliaExport(e.target.value)}>
              <option value="">Todas</option>
              {familias.map((f) => (
                <option key={f.categoryId} value={f.categoryId}>
                  {f.name}
                  {f.isActive ? '' : ' (inactiva)'}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={conInactivos}
              onChange={(e) => setConInactivos(e.target.checked)}
            />
            Incluir productos inactivos
          </label>
          <div className="import-acciones">
            <button className="btn-secondary" onClick={() => void exportar()} disabled={exportando}>
              {exportando ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
              Descargar Excel
            </button>
          </div>
        </div>
      </section>

      {/* ---------- 1. archivo y opciones ---------- */}
      <section className="catalog-card">
        <div className="panel-title">1 · Archivo</div>

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
                <strong>Arrastrá la plantilla o el export editado, o hacé clic</strong>
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
              <small>
                La plantilla no trae matriz de compatibilidad; esto es una inferencia. En la
                comparación se usa solo para los add-ons nuevos.
              </small>
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
              <button
                className="btn-primary"
                onClick={() => void comparar()}
                disabled={cargando !== null}
                title="Muestra qué cambia contra la base y aplicás solo lo que marques"
              >
                {cargando === 'comparar' ? (
                  <Loader2 size={15} className="spin" />
                ) : (
                  <GitCompareArrows size={15} />
                )}
                Comparar con la base
              </button>
              <button
                className="btn-secondary"
                onClick={() => void verPrevia()}
                disabled={cargando !== null}
                title="Carga completa: reemplaza la serie entera de la plantilla"
              >
                {cargando === 'previa' ? <Loader2 size={15} className="spin" /> : <FileSpreadsheet size={15} />}
                Analizar carga completa
              </button>
              <button className="btn-secondary" onClick={limpiar} disabled={cargando !== null}>
                <X size={15} /> Quitar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ---------- 2a. diferencias con la base ---------- */}
      {aplicadoComp && (
        <section className="catalog-card">
          <div className="panel-title">
            <CheckCircle2 size={16} /> Cambios aplicados
          </div>
          <div className="import-cifras">
            <div className="ok">
              <b>{aplicadoComp.updated}</b>
              <span>actualizados</span>
            </div>
            <div className="ok">
              <b>{aplicadoComp.inserted}</b>
              <span>nuevos</span>
            </div>
            <div className={aplicadoComp.deactivated > 0 ? 'warn' : ''}>
              <b>{aplicadoComp.deactivated}</b>
              <span>desactivados</span>
            </div>
            <div>
              <b>{aplicadoComp.addOnLinks}</b>
              <span>vínculos add-on</span>
            </div>
          </div>
          {aplicadoComp.ignored > 0 && (
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {aplicadoComp.ignored} de los marcados ya coincidían con la base y no se tocaron.
            </p>
          )}
        </section>
      )}

      {comparacion && (
        <section className="catalog-card">
          <div className="panel-title">
            2 · Diferencias con la base
            <span className="muted">
              {' '}
              — {comparacion.fileName} · hoja {comparacion.sheet}
            </span>
          </div>

          <Ambiguedades
            ambiguas={comparacion.ambiguities}
            resoluciones={resoluciones}
            onResolver={setResoluciones}
            etiqueta="Volver a comparar"
            onReintentar={() => void comparar()}
          />
          <Problemas issues={comparacion.issues} />

          <CatalogCompare
            comparacion={comparacion}
            aplicando={cargando === 'aplicarComp'}
            onAplicar={(s) => void aplicarComparacion(s)}
          />
        </section>
      )}

      {/* ---------- 2b. diagnóstico de la carga completa ---------- */}
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

          <Ambiguedades
            ambiguas={previa.ambiguities}
            resoluciones={resoluciones}
            onResolver={setResoluciones}
            etiqueta="Volver a analizar"
            onReintentar={() => void verPrevia()}
          />
          <Problemas issues={previa.issues} />

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

      {/* ---------- 3. resultado de la carga completa ---------- */}
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

/** Problemas del archivo: en rojo los que impiden aplicar, en ámbar los avisos. */
function Problemas({ issues }: { issues: CatalogImportIssue[] }) {
  return (
    <>
      {issues
        .filter((i) => i.blocking)
        .map((p, i) => (
          <div className="import-issue bloquea" key={`b${i}`}>
            <XCircle size={16} />
            <div>
              {p.message}
              {p.detail && <small>{p.detail}</small>}
            </div>
          </div>
        ))}
      {issues
        .filter((i) => !i.blocking)
        .map((p, i) => (
          <div className="import-issue aviso" key={`a${i}`}>
            <AlertTriangle size={16} />
            <div>
              {p.message}
              {p.detail && <small>{p.detail}</small>}
            </div>
          </div>
        ))}
    </>
  );
}

interface AmbiguedadesProps {
  ambiguas: CatalogImportAmbiguity[];
  resoluciones: Record<string, string>;
  onResolver: (r: Record<string, string>) => void;
  etiqueta: string;
  onReintentar: () => void;
}

/** Clasificaciones que la plantilla deja sin decidir: se resuelven acá mismo y se reintenta. */
function Ambiguedades({ ambiguas, resoluciones, onResolver, etiqueta, onReintentar }: AmbiguedadesProps) {
  if (ambiguas.length === 0) return null;
  return (
    <div className="import-ambiguas">
      <div className="import-ambiguas-head">
        <AlertTriangle size={16} /> La plantilla deja la clasificación sin decidir
      </div>
      {ambiguas.map((a) => (
        <div className="import-ambigua" key={a.value}>
          <code>{a.value}</code>
          <small>{a.rows} fila(s)</small>
          <select
            value={resoluciones[a.value] ?? ''}
            onChange={(e) => onResolver({ ...resoluciones, [a.value]: e.target.value })}
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
        onClick={onReintentar}
        disabled={ambiguas.some((a) => !resoluciones[a.value])}
      >
        {etiqueta}
      </button>
    </div>
  );
}
