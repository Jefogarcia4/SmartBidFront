import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiKeysApi } from '../api/services';
import { BASE_URL } from '../api/http';
import type { ApiKeyAdminDto, ApiKeyDto, IssuedApiKeyDto, UserOptionDto } from '../types/api';

type Tab = 'mine' | 'all';

interface IntegrationsPageProps {
  onBack: () => void;
}

/**
 * Módulo de integraciones: emisión y control de las API keys que los comerciales registran
 * en FlexGPT. El ADMIN además ve y emite las de los demás, para poder entregárselas.
 */
export function IntegrationsPage({ onBack }: IntegrationsPageProps) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState<Tab>('mine');
  const [mine, setMine] = useState<ApiKeyDto[]>([]);
  const [all, setAll] = useState<ApiKeyAdminDto[]>([]);
  const [users, setUsers] = useState<UserOptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  // La key en claro solo existe en memoria y solo hasta que se cierra el modal.
  const [issued, setIssued] = useState<{ key: IssuedApiKeyDto; owner: string } | null>(null);

  const notify = (text: string, error?: boolean) => setToast({ text, error });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMine(await apiKeysApi.mine());
      if (isAdmin) {
        const [keys, people] = await Promise.all([apiKeysApi.all(), apiKeysApi.users()]);
        setAll(keys);
        setUsers(people);
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudieron cargar las API keys', true);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const createMine = async (name: string, days: number | null) => {
    try {
      const key = await apiKeysApi.create(name, days);
      setIssued({ key, owner: user?.fullName ?? 'tu usuario' });
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo emitir la key', true);
    }
  };

  const createFor = async (userId: number, name: string, days: number | null) => {
    try {
      const key = await apiKeysApi.createFor(userId, name, days);
      const owner = users.find((u) => u.userId === userId);
      setIssued({ key, owner: owner?.fullName ?? `usuario ${userId}` });
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo emitir la key', true);
    }
  };

  const revoke = async (id: number, admin: boolean) => {
    if (!confirm('Revocar esta API key es inmediato e irreversible. ¿Continuar?')) return;
    try {
      await (admin ? apiKeysApi.revokeAny(id) : apiKeysApi.revoke(id));
      notify('API key revocada');
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo revocar', true);
    }
  };

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
        <span className="families-label">INTEGRACIONES:</span>
        <nav className="family-tabs">
          <button
            className={`family-tab ${tab === 'mine' ? 'active' : ''}`}
            onClick={() => setTab('mine')}
          >
            <KeyRound size={15} /> Mis API keys
          </button>
          {isAdmin && (
            <button
              className={`family-tab ${tab === 'all' ? 'active' : ''}`}
              onClick={() => setTab('all')}
            >
              <Users size={15} /> Keys del equipo
            </button>
          )}
        </nav>
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
        <IntegrationGuide />

        {loading ? (
          <div className="center-screen">
            <div className="spinner" />
          </div>
        ) : tab === 'mine' ? (
          <MyKeys keys={mine} onCreate={createMine} onRevoke={(id) => revoke(id, false)} />
        ) : (
          <TeamKeys
            keys={all}
            users={users}
            onCreate={createFor}
            onRevoke={(id) => revoke(id, true)}
          />
        )}
      </div>

      <footer className="app-footer">SmartBid © 2026 | Enterprise Marketplace Solution</footer>

      {issued && <IssuedKeyModal issued={issued} onClose={() => setIssued(null)} />}
      {toast && <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.text}</div>}
    </div>
  );
}

/** Explica para qué sirve una API key y dónde se pega, sin salir de la pantalla. */
function IntegrationGuide() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  const rows: { label: string; value: string; id: string }[] = [
    { label: 'MCP (recomendado)', value: `${BASE_URL}/mcp`, id: 'mcp' },
    { label: 'OpenAPI', value: `${BASE_URL}/openapi/ai.json`, id: 'openapi' },
  ];

  return (
    <section className="integration-guide">
      <div className="integration-guide-head">
        <ShieldCheck size={18} />
        <div>
          <h3>Conectar SmartBid con FlexGPT</h3>
          <p>
            Emití una API key, pegala en FlexGPT con autenticación <code>Bearer</code> y el modelo
            podrá consultar cotizaciones y generar SOW. Cada key hereda el alcance de su dueño:
            solo ve las cotizaciones de ese comercial.
          </p>
        </div>
      </div>
      <div className="integration-urls">
        {rows.map((r) => (
          <div className="integration-url" key={r.id}>
            <span className="integration-url-label">{r.label}</span>
            <code>{r.value}</code>
            <button className="icon-btn" title="Copiar" onClick={() => copy(r.value, r.id)}>
              {copied === r.id ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Formulario compartido por las dos pestañas. `people` presente = modo admin. */
function KeyForm({
  people,
  onSubmit,
}: {
  people?: UserOptionDto[];
  onSubmit: (userId: number | null, name: string, days: number | null) => void;
}) {
  const [name, setName] = useState('FlexGPT');
  const [days, setDays] = useState<string>('365');
  const [userId, setUserId] = useState<string>('');
  const [search, setSearch] = useState('');

  // El equipo pasa de 50 personas: sin filtro el desplegable es inmanejable.
  const active = useMemo(() => {
    const list = (people ?? []).filter((u) => u.isActive);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [people, search]);

  const ready = name.trim().length > 0 && (!people || userId !== '');

  return (
    <div className="key-form">
      {people && (
        <>
          <label>
            Buscar
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setUserId('');
              }}
              placeholder="Nombre o correo"
            />
          </label>
          <label>
            Comercial ({active.length})
            <select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Elegí un usuario…</option>
              {active.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName} · {u.roleCode}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <label>
        Nombre
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Para qué la vas a usar"
        />
      </label>
      <label>
        Vence en (días)
        <input
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="vacío = sin vencimiento"
        />
      </label>
      <button
        className="btn-add"
        disabled={!ready}
        onClick={() => {
          onSubmit(people ? Number(userId) : null, name.trim(), days ? Number(days) : null);
          setName('FlexGPT');
        }}
      >
        <Plus size={14} /> Emitir key
      </button>
    </div>
  );
}

function KeyRows({
  keys,
  showOwner,
  onRevoke,
}: {
  keys: (ApiKeyDto | ApiKeyAdminDto)[];
  showOwner?: boolean;
  onRevoke: (id: number) => void;
}) {
  if (keys.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">
          <KeyRound size={32} />
        </div>
        Todavía no hay API keys emitidas
      </div>
    );
  }

  const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString('es-CO') : '—');

  return (
    <table className="product-table">
      <thead>
        <tr>
          {showOwner && <th>Dueño</th>}
          <th>Nombre</th>
          <th>Key</th>
          <th>Creada</th>
          <th>Vence</th>
          <th>Último uso</th>
          <th>Estado</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => {
          const owner = 'userEmail' in k ? k : null;
          return (
            <tr key={k.apiKeyId}>
              {showOwner && (
                <td>
                  <strong>{owner?.userFullName}</strong>
                  <br />
                  <small className="muted">{owner?.userEmail}</small>
                </td>
              )}
              <td>{k.name}</td>
              <td>
                <code className="key-prefix">{k.keyPrefix}…</code>
              </td>
              <td>{fmt(k.createdAt)}</td>
              <td>{fmt(k.expiresAt)}</td>
              <td>{fmt(k.lastUsedAt)}</td>
              <td>
                <span className={`status-badge ${k.isActive ? 'accepted' : 'draft'}`}>
                  {k.revokedAt ? 'Revocada' : k.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td>
                {!k.revokedAt && (
                  <button
                    className="icon-btn danger"
                    title="Revocar"
                    onClick={() => onRevoke(k.apiKeyId)}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MyKeys({
  keys,
  onCreate,
  onRevoke,
}: {
  keys: ApiKeyDto[];
  onCreate: (name: string, days: number | null) => void;
  onRevoke: (id: number) => void;
}) {
  return (
    <div className="catalog-card">
      <div className="panel-title">Mis API keys</div>
      <KeyForm onSubmit={(_, name, days) => onCreate(name, days)} />
      <KeyRows keys={keys} onRevoke={onRevoke} />
    </div>
  );
}

function TeamKeys({
  keys,
  users,
  onCreate,
  onRevoke,
}: {
  keys: ApiKeyAdminDto[];
  users: UserOptionDto[];
  onCreate: (userId: number, name: string, days: number | null) => void;
  onRevoke: (id: number) => void;
}) {
  return (
    <div className="catalog-card">
      <div className="panel-title">API keys del equipo</div>
      <p className="panel-hint">
        La key queda a nombre del comercial que elijas, no del tuyo: en FlexGPT verá únicamente
        sus propias cotizaciones. Entregásela por un canal seguro.
      </p>
      <KeyForm people={users} onSubmit={(userId, name, days) => onCreate(userId!, name, days)} />
      <KeyRows keys={keys} showOwner onRevoke={onRevoke} />
    </div>
  );
}

/** La key en claro se muestra UNA sola vez: después solo queda su hash en la base. */
function IssuedKeyModal({
  issued,
  onClose,
}: {
  issued: { key: IssuedApiKeyDto; owner: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(issued.key.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <KeyRound size={18} /> API key de {issued.owner}
        </div>
        <div className="modal-body">
          <div className="issued-warning">
            <TriangleAlert size={16} />
            <span>
              Copiala ahora. Es la única vez que se muestra: SmartBid solo guarda su hash y no hay
              forma de recuperarla.
            </span>
          </div>
          <div className="issued-value">
            <code>{issued.key.apiKey}</code>
            <button className="btn-add" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copiada' : 'Copiar'}
            </button>
          </div>
          <p className="panel-hint">
            En FlexGPT: autenticación <code>Bearer</code> y pegá <strong>solo la key</strong>, sin
            escribir la palabra <code>Bearer</code>.
          </p>
        </div>
        <div className="modal-actions">
          <button className="btn-add" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
