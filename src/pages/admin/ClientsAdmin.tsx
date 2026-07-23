import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Pencil, Users, X } from 'lucide-react';
import { clientsApi } from '../../api/services';
import type { ClientDto } from '../../types/api';
import { Pagination, usePagination } from '../../components/Pagination';

interface Props {
  notify: (text: string, error?: boolean) => void;
}

interface ClientForm {
  id: number | null;
  taxId: string;
  businessName: string;
  sector: string;
  city: string;
  isActive: boolean;
}

interface ContactForm {
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
}

const EMPTY_CONTACT: ContactForm = { name: '', jobTitle: '', email: '', phone: '' };

export function ClientsAdmin({ notify }: Props) {
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ClientForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [contactsFor, setContactsFor] = useState<ClientDto | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>(EMPTY_CONTACT);
  const pager = usePagination(clients, 10);

  async function load() {
    setLoading(true);
    try {
      setClients(await clientsApi.list(search || undefined));
    } catch {
      notify('Error cargando clientes', true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveClient(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      if (form.id == null) {
        await clientsApi.create({
          taxId: form.taxId,
          businessName: form.businessName,
          sector: form.sector || null,
          city: form.city || null,
        });
      } else {
        await clientsApi.update(form.id, {
          businessName: form.businessName,
          sector: form.sector || null,
          city: form.city || null,
          isActive: form.isActive,
        });
      }
      notify('Cliente guardado');
      setForm(null);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error guardando cliente', true);
    } finally {
      setSaving(false);
    }
  }

  async function addContact(e: FormEvent) {
    e.preventDefault();
    if (!contactsFor) return;
    setSaving(true);
    try {
      await clientsApi.addContact(contactsFor.clientId, {
        name: contactForm.name,
        jobTitle: contactForm.jobTitle || null,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
      });
      notify('Contacto agregado');
      setContactForm(EMPTY_CONTACT);
      // refresca la lista y el modal
      const updated = await clientsApi.list(search || undefined);
      setClients(updated);
      setContactsFor(updated.find((c) => c.clientId === contactsFor.clientId) ?? null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error agregando contacto', true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        <input
          placeholder="Buscar por NIT o razón social…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void load()}
          style={{ minWidth: 260 }}
        />
        <button className="icon-btn" title="Buscar" onClick={() => void load()}>
          🔍
        </button>
        <div className="toolbar-spacer" />
        <button
          className="btn-add"
          onClick={() =>
            setForm({ id: null, taxId: '', businessName: '', sector: '', city: '', isActive: true })
          }
        >
          <Plus size={14} /> Nuevo cliente
        </button>
      </div>

      <div className="catalog-card">
        {loading ? (
          <div className="spinner" />
        ) : (
          <table className="product-table">
            <thead>
              <tr>
                <th>NIT</th>
                <th>Razón social</th>
                <th>Sector</th>
                <th>Ciudad</th>
                <th>Contactos</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((c) => (
                <tr key={c.clientId}>
                  <td className="cell-id">{c.taxId}</td>
                  <td style={{ fontWeight: 600 }}>{c.businessName}</td>
                  <td className="muted">{c.sector ?? '—'}</td>
                  <td className="muted">{c.city ?? '—'}</td>
                  <td>{c.contacts.length}</td>
                  <td>
                    <span className={`status-pill ${c.isActive ? 'on' : 'off'}`}>
                      {c.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title="Editar"
                        onClick={() =>
                          setForm({
                            id: c.clientId,
                            taxId: c.taxId,
                            businessName: c.businessName,
                            sector: c.sector ?? '',
                            city: c.city ?? '',
                            isActive: c.isActive,
                          })
                        }
                      >
                        <Pencil size={13} />
                      </button>
                      <button className="icon-btn" title="Contactos" onClick={() => setContactsFor(c)}>
                        <Users size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && <Pagination pager={pager} />}
      </div>

      {/* --- Modal cliente --- */}
      {form && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {form.id == null ? 'Nuevo cliente' : 'Editar cliente'}
              <button className="modal-close" onClick={() => setForm(null)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={saveClient}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="field">
                    <label>NIT</label>
                    <input
                      required
                      disabled={form.id != null}
                      value={form.taxId}
                      onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>RAZÓN SOCIAL</label>
                    <input
                      required
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="field">
                    <label>SECTOR</label>
                    <input
                      value={form.sector}
                      onChange={(e) => setForm({ ...form, sector: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>CIUDAD</label>
                    <input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                </div>
                {form.id != null && (
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    Activo (desactivar conserva el histórico de cotizaciones — RF-018)
                  </label>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setForm(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal contactos --- */}
      {contactsFor && (
        <div className="modal-overlay" onClick={() => setContactsFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              Contactos — {contactsFor.businessName}
              <button className="modal-close" onClick={() => setContactsFor(null)}>
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              {contactsFor.contacts.length === 0 ? (
                <div className="muted">Sin contactos registrados</div>
              ) : (
                contactsFor.contacts.map((ct) => (
                  <div className="addon-link-row" key={ct.contactId}>
                    <span>
                      <strong>{ct.name}</strong>
                      {ct.jobTitle && <span className="muted"> · {ct.jobTitle}</span>}
                      <br />
                      <span className="muted">
                        {[ct.email, ct.phone].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </span>
                  </div>
                ))
              )}

              <form onSubmit={addContact}>
                <div className="panel-title" style={{ padding: '10px 0 8px' }}>
                  Agregar contacto
                </div>
                <div className="form-row">
                  <div className="field">
                    <label>NOMBRE</label>
                    <input
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>CARGO</label>
                    <input
                      value={contactForm.jobTitle}
                      onChange={(e) => setContactForm({ ...contactForm, jobTitle: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="field">
                    <label>EMAIL</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>TELÉFONO</label>
                    <input
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    />
                  </div>
                </div>
                <button className="btn-add" type="submit" disabled={saving} style={{ marginTop: 10 }}>
                  <Plus size={14} /> {saving ? 'Guardando…' : 'Agregar contacto'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
