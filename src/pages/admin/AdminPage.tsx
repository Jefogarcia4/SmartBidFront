import { useEffect, useState } from 'react';
import { Package, FolderTree, TrendingUp, Building2, ArrowLeft, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProductsAdmin } from './ProductsAdmin';
import { CategoriesAdmin } from './CategoriesAdmin';
import { TrmAdmin } from './TrmAdmin';
import { ClientsAdmin } from './ClientsAdmin';

type AdminTab = 'products' | 'categories' | 'trm' | 'clients';

const TABS: { id: AdminTab; label: string; icon: typeof Package }[] = [
  { id: 'products', label: 'Productos y Add-ons', icon: Package },
  { id: 'categories', label: 'Categorías y Subcategorías', icon: FolderTree },
  { id: 'trm', label: 'TRM', icon: TrendingUp },
  { id: 'clients', label: 'Clientes', icon: Building2 },
];

interface AdminPageProps {
  onBack: () => void;
}

export function AdminPage({ onBack }: AdminPageProps) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<AdminTab>('products');
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = (text: string, error?: boolean) => setToast({ text, error });

  // Guard: solo ADMIN
  if (user?.role !== 'ADMIN') {
    return (
      <div className="app-shell">
        <div className="center-screen">
          <div className="empty-state">
            <div className="icon">
              <ShieldAlert size={36} />
            </div>
            Acceso restringido: este módulo es solo para Administradores
            <div style={{ marginTop: 16 }}>
              <button className="btn-add" onClick={onBack}>
                <ArrowLeft size={14} /> Volver al catálogo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = (user.fullName ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">SmartBid</span>
        <span className="families-label">ADMINISTRACIÓN:</span>
        <nav className="family-tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`family-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </nav>
        <button className="family-tab" onClick={onBack}>
          <ArrowLeft size={15} /> Catálogo
        </button>
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
      </header>

      <div className="admin-body">
        {tab === 'products' && <ProductsAdmin notify={notify} />}
        {tab === 'categories' && <CategoriesAdmin notify={notify} />}
        {tab === 'trm' && <TrmAdmin notify={notify} />}
        {tab === 'clients' && <ClientsAdmin notify={notify} />}
      </div>

      <footer className="app-footer">SmartBid © 2026 | Enterprise Marketplace Solution</footer>

      {toast && <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.text}</div>}
    </div>
  );
}
