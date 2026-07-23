import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { TrendingUp } from 'lucide-react';
import { exchangeRatesApi } from '../../api/services';
import type { ExchangeRateDto } from '../../types/api';
import { Pagination, usePagination } from '../../components/Pagination';
import { money } from '../../utils/format';

interface TrmAdminProps {
  notify: (text: string, error?: boolean) => void;
}

export function TrmAdmin({ notify }: TrmAdminProps) {
  const [rates, setRates] = useState<ExchangeRateDto[]>([]);
  const [current, setCurrent] = useState<ExchangeRateDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rate, setRate] = useState('');
  const pager = usePagination(rates, 10);

  async function load() {
    setLoading(true);
    try {
      const [list, cur] = await Promise.all([
        exchangeRatesApi.list(),
        exchangeRatesApi.current().catch(() => null),
      ]);
      setRates(list);
      setCurrent(cur);
    } catch {
      notify('Error cargando TRM', true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await exchangeRatesApi.create({ effectiveDate: date, rateUSDCOP: Number(rate) });
      notify('TRM registrada correctamente');
      setRate('');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error registrando la TRM', true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="trm-card">
        <div>
          <small>TRM VIGENTE (USD → COP)</small>
          <div className="trm-value">
            {current ? money(current.rateUSDCOP) : loading ? '…' : 'Sin registro'}
          </div>
          {current && <small>Fecha efectiva: {current.effectiveDate}</small>}
        </div>
        <TrendingUp size={44} style={{ opacity: 0.5 }} />
      </div>

      <form className="trm-form" onSubmit={handleSubmit}>
        <div className="field">
          <label>FECHA EFECTIVA</label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>TASA (COP POR USD)</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder="4100.50"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <button className="btn-add" type="submit" disabled={saving}>
          {saving ? 'Registrando…' : 'Registrar TRM'}
        </button>
        <span className="muted">Una sola tasa por fecha (RN-005)</span>
      </form>

      <div className="catalog-card">
        {loading ? (
          <div className="spinner" />
        ) : (
          <table className="product-table">
            <thead>
              <tr>
                <th>Fecha efectiva</th>
                <th style={{ textAlign: 'right' }}>Tasa USD→COP</th>
                <th>Registrada</th>
              </tr>
            </thead>
            <tbody>
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                    No hay TRM registradas
                  </td>
                </tr>
              ) : (
                pager.pageItems.map((r) => (
                  <tr key={r.exchangeRateId}>
                    <td className="cell-id">{r.effectiveDate}</td>
                    <td className="cell-cost">
                      <span className="cost-total">{money(r.rateUSDCOP)}</span>
                    </td>
                    <td className="muted">{new Date(r.registeredAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        {!loading && <Pagination pager={pager} />}
      </div>
    </>
  );
}
