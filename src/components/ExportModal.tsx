import { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { clientsApi, quotationsApi } from '../api/services';
import type { ClientDto, QuotationDto } from '../types/api';
import { useCart } from '../context/CartContext';
import { money } from '../utils/format';

interface ExportModalProps {
  onClose: () => void;
  onSuccess: (q: QuotationDto) => void;
}

export function ExportModal({ onClose, onSuccess }: ExportModalProps) {
  const { lines, totalCOP, clear } = useCart();
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [clientId, setClientId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<QuotationDto | null>(null);

  useEffect(() => {
    clientsApi
      .list()
      .then((cs) => setClients(cs.filter((c) => c.isActive)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (clientId === '') return;
    setSaving(true);
    setError(null);
    try {
      // 1. Crear la cotización (POST /api/quotations)
      const quotation = await quotationsApi.create({
        clientId: Number(clientId),
        notes: notes || null,
      });
      // 2. Agregar cada paquete base con sus add-ons (POST /{id}/items)
      let latest = quotation;
      for (const line of lines) {
        latest = await quotationsApi.addItem(quotation.quotationId, {
          productId: line.product.productId,
          quantity: line.quantity,
          addOns: line.addOns.map((a) => ({
            productId: a.product.productId,
            quantity: a.quantity,
          })),
        });
      }
      setCreated(latest);
      clear();
      onSuccess(latest);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creando la cotización');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {created ? 'Cotización creada' : 'Exportar Cotización'}
          <button className="modal-close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {created ? (
          <div className="modal-body">
            <div className="success-box">
              <div className="check">
                <CheckCircle2 size={30} />
              </div>
              <h3>{created.number}</h3>
              <p>
                Cliente: {created.clientName} · Estado: {created.statusName}
              </p>
              <p style={{ marginTop: 8 }}>
                Total: <strong>{money(created.totalCOP)}</strong>
                {created.totalUSD != null && <> · USD {money(created.totalUSD)}</>}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-body">
              {error && <div className="form-error">{error}</div>}
              <div className="field">
                <label>CLIENTE</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={loading}
                >
                  <option value="">{loading ? 'Cargando clientes…' : 'Selecciona un cliente'}</option>
                  {clients.map((c) => (
                    <option key={c.clientId} value={c.clientId}>
                      {c.businessName} — {c.taxId}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>NOTAS (OPCIONAL)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas para la cotización…"
                />
              </div>
              <div className="modal-summary">
                <span>
                  {lines.length} ítem{lines.length !== 1 ? 's' : ''}
                </span>
                <strong>{money(totalCOP)}</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                disabled={saving || clientId === ''}
                onClick={handleCreate}
              >
                {saving ? 'Creando…' : 'Crear cotización'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
