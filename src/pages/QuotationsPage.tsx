import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, LogOut, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { quotationsApi } from '../api/services';
import { QUOTATION_STATUSES } from '../types/api';
import type { QuotationDto, QuotationListItemDto } from '../types/api';
import { Pagination, usePagination } from '../components/Pagination';
import { money } from '../utils/format';

const STATUS_CLASS: Record<string, string> = {
  Borrador: 'draft',
  'En Revision': 'review',
  'En Revisión': 'review',
  Enviada: 'sent',
  Aceptada: 'accepted',
  Rechazada: 'rejected',
  Expirada: 'expired',
};

interface QuotationsPageProps {
  onBack: () => void;
}

export function QuotationsPage({ onBack }: QuotationsPageProps) {
  const { user, logout } = useAuth();
  const [quotations, setQuotations] = useState<QuotationListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusId, setStatusId] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [detail, setDetail] = useState<QuotationDto | null>(null);
  const [newStatus, setNewStatus] = useState<number | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const pager = usePagination(quotations, 10);

  const notify = (text: string, error?: boolean) => setToast({ text, error });

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      setQuotations(
        await quotationsApi.search({
          userId: Number(user.userId),
          statusId: statusId === '' ? undefined : statusId,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
      );
    } catch {
      notify('Error cargando cotizaciones', true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusId, fromDate, toDate]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function openDetail(id: number) {
    try {
      const q = await quotationsApi.get(id);
      setDetail(q);
      setNewStatus('');
      setStatusNote('');
    } catch {
      notify('Error cargando el detalle', true);
    }
  }

  async function changeStatus() {
    if (!detail || newStatus === '') return;
    setSaving(true);
    try {
      const updated = await quotationsApi.changeStatus(detail.quotationId, {
        statusId: newStatus,
        note: statusNote || null,
      });
      setDetail(updated);
      notify(`Estado actualizado a ${updated.statusName}`);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error cambiando el estado', true);
    } finally {
      setSaving(false);
    }
  }

  const initials = (user?.fullName ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">SmartBid</span>
        <span className="families-label">MIS COTIZACIONES</span>
        <div className="family-tabs" />
        <button className="family-tab" onClick={onBack}>
          <ArrowLeft size={15} /> Catálogo
        </button>
        {user && (
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div>
              {user.fullName}
              <small>{user.role}</small>
            </div>
            <button className="logout-btn" title="Cerrar sesión" onClick={logout}>
              <LogOut size={16} />
            </button>
          </div>
        )}
      </header>

      <div className="admin-body">
        <div className="admin-toolbar">
          <select
            value={statusId}
            onChange={(e) => setStatusId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Todos los estados</option>
            {QUOTATION_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <span className="muted">a</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button className="icon-btn" title="Recargar" onClick={() => void load()}>
            <RefreshCw size={14} />
          </button>
          <div className="toolbar-spacer" />
          <span className="muted">
            {quotations.length} cotización{quotations.length !== 1 ? 'es' : ''}
          </span>
        </div>

        <div className="catalog-card">
          {loading ? (
            <div className="spinner" />
          ) : quotations.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <FileText size={36} />
              </div>
              Aún no tienes cotizaciones — créalas desde el catálogo
            </div>
          ) : (
            <table className="product-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Desc. %</th>
                  <th style={{ textAlign: 'right' }}>Total COP</th>
                  <th style={{ textAlign: 'right' }}>Total USD</th>
                  <th>Creada</th>
                  <th>Válida hasta</th>
                </tr>
              </thead>
              <tbody>
                {pager.pageItems.map((q) => (
                  <tr
                    key={q.quotationId}
                    style={{ cursor: 'pointer' }}
                    onClick={() => void openDetail(q.quotationId)}
                  >
                    <td className="cell-id">{q.number}</td>
                    <td style={{ fontWeight: 600 }}>{q.clientName}</td>
                    <td>
                      <span className={`status-badge ${STATUS_CLASS[q.statusName] ?? 'draft'}`}>
                        {q.statusName}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{q.discountPercent}%</td>
                    <td className="cell-cost">
                      <span className="cost-total">{money(q.totalCOP)}</span>
                    </td>
                    <td className="cell-cost">
                      <span className="cost-unit">
                        {q.totalUSD != null ? money(q.totalUSD) : '—'}
                      </span>
                    </td>
                    <td className="muted">{q.creationDate}</td>
                    <td className="muted">{q.validityDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && <Pagination pager={pager} />}
        </div>
      </div>

      <footer className="app-footer">SmartBid © 2026 | Enterprise Marketplace Solution</footer>

      {/* --- Detalle de cotización --- */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              {detail.number} — {detail.clientName}
              <button className="modal-close" onClick={() => setDetail(null)}>
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-summary">
                <span>
                  Estado:{' '}
                  <span className={`status-badge ${STATUS_CLASS[detail.statusName] ?? 'draft'}`}>
                    {detail.statusName}
                  </span>
                </span>
                <span className="muted">
                  {detail.creationDate} → {detail.validityDate}
                </span>
              </div>

              <table className="product-table">
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th style={{ textAlign: 'center' }}>Cant.</th>
                    <th style={{ textAlign: 'right' }}>Precio COP</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((i) => (
                    <tr key={i.quotationItemId}>
                      <td>
                        <span style={{ paddingLeft: i.isAddOn && i.parentItemId ? 18 : 0 }}>
                          {i.isAddOn && i.parentItemId ? '↳ ' : ''}
                          <strong>{i.productCode}</strong> {i.productName}
                          {i.isAddOn && <span className="badge-addon"> Add-on</span>}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{i.quantity}</td>
                      <td className="cell-cost">{money(i.unitPriceCOP)}</td>
                      <td className="cell-cost">
                        <span className="cost-total">{money(i.lineSubtotalCOP)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="modal-summary">
                <span>
                  Subtotal {money(detail.subtotalCOP)} · Desc. {detail.discountPercent}% (−
                  {money(detail.discountAmountCOP)})
                </span>
                <strong>
                  {money(detail.totalCOP)}
                  {detail.totalUSD != null && (
                    <span className="muted"> · USD {money(detail.totalUSD)}</span>
                  )}
                </strong>
              </div>

              <div className="panel-title" style={{ padding: '4px 0 0' }}>
                Cambiar estado
              </div>
              <div className="admin-toolbar">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">Nuevo estado…</option>
                  {QUOTATION_STATUSES.filter((s) => s.id !== detail.statusId).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Nota (opcional)"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn-add"
                  disabled={saving || newStatus === ''}
                  onClick={() => void changeStatus()}
                >
                  {saving ? 'Guardando…' : 'Aplicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.text}</div>}
    </div>
  );
}
