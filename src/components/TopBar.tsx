import { Server, ClipboardList, Users, Bot, Shield, LayoutGrid, LogOut, Settings, FileText, Plug } from 'lucide-react';
import type { CategoryDto } from '../types/api';
import { useAuth } from '../context/AuthContext';

const ICONS: Record<string, typeof Server> = {
  server: Server,
  tasks: ClipboardList,
  users: Users,
  robot: Bot,
  shield: Shield,
};

interface TopBarProps {
  categories: CategoryDto[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onOpenAdmin?: () => void;
  onOpenQuotes?: () => void;
  onOpenIntegrations?: () => void;
}

export function TopBar({
  categories,
  activeId,
  onSelect,
  onOpenAdmin,
  onOpenQuotes,
  onOpenIntegrations,
}: TopBarProps) {
  const { user, logout } = useAuth();
  const initials = (user?.fullName ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="topbar">
      <span className="brand">SmartBid</span>
      <span className="families-label">FAMILIAS:</span>
      <nav className="family-tabs">
        {categories.map((c) => {
          const Icon = ICONS[c.icon ?? ''] ?? LayoutGrid;
          return (
            <button
              key={c.categoryId}
              className={`family-tab ${c.categoryId === activeId ? 'active' : ''}`}
              onClick={() => onSelect(c.categoryId)}
            >
              <Icon size={15} />
              {c.name}
            </button>
          );
        })}
      </nav>
      {onOpenQuotes && (
        <button className="family-tab" onClick={onOpenQuotes}>
          <FileText size={15} /> Mis Cotizaciones
        </button>
      )}
      {onOpenIntegrations && (
        <button className="family-tab" onClick={onOpenIntegrations}>
          <Plug size={15} /> Integraciones
        </button>
      )}
      {user?.role === 'ADMIN' && onOpenAdmin && (
        <button className="family-tab" onClick={onOpenAdmin}>
          <Settings size={15} /> Administración
        </button>
      )}
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
  );
}
