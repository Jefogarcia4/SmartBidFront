import { useEffect, useRef, useState } from 'react';
import {
  Server,
  ClipboardList,
  Users,
  Bot,
  Shield,
  LayoutGrid,
  LogOut,
  Settings,
  FileText,
  Plug,
  ChevronDown,
} from 'lucide-react';
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
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const launcherRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const initials = (user?.fullName ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const activeCategory = categories.find((c) => c.categoryId === activeId) ?? null;

  // Cierra los menús al hacer clic fuera o pulsar Escape
  useEffect(() => {
    if (!launcherOpen && !profileOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (launcherRef.current && !launcherRef.current.contains(e.target as Node)) {
        setLauncherOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setLauncherOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [launcherOpen, profileOpen]);

  function pickCategory(id: number) {
    onSelect(id);
    setLauncherOpen(false);
  }

  function runFromProfile(action?: () => void) {
    setProfileOpen(false);
    action?.();
  }

  return (
    <header className="topbar">
      <span className="brand">SmartBid</span>

      <div className="launcher" ref={launcherRef}>
        <button
          className={`launcher-btn ${launcherOpen ? 'open' : ''}`}
          onClick={() => {
            setProfileOpen(false);
            setLauncherOpen((v) => !v);
          }}
          aria-haspopup="true"
          aria-expanded={launcherOpen}
        >
          <LayoutGrid size={18} />
          <span className="launcher-btn-text">
            {activeCategory ? activeCategory.name : 'Categorías'}
          </span>
          <ChevronDown size={15} className="launcher-caret" />
        </button>

        {launcherOpen && (
          <div className="launcher-panel" role="menu">
            <div className="launcher-panel-head">
              <strong>Categorías</strong>
              <small>{categories.length} disponibles</small>
            </div>
            {categories.length === 0 ? (
              <p className="launcher-empty">No hay categorías activas.</p>
            ) : (
              <div className="launcher-grid">
                {categories.map((c) => {
                  const Icon = ICONS[c.icon ?? ''] ?? LayoutGrid;
                  return (
                    <button
                      key={c.categoryId}
                      className={`launcher-item ${c.categoryId === activeId ? 'active' : ''}`}
                      onClick={() => pickCategory(c.categoryId)}
                      role="menuitem"
                      title={c.description ?? c.name}
                    >
                      <span className="launcher-item-icon">
                        <Icon size={22} />
                      </span>
                      <span className="launcher-item-name">{c.name}</span>
                      {c.description && (
                        <span className="launcher-item-desc">{c.description}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="topbar-spacer" />

      {user && (
        <div className="profile" ref={profileRef}>
          <button
            className={`user-chip ${profileOpen ? 'open' : ''}`}
            onClick={() => {
              setLauncherOpen(false);
              setProfileOpen((v) => !v);
            }}
            aria-haspopup="true"
            aria-expanded={profileOpen}
          >
            <div className="user-avatar">{initials}</div>
            <div className="user-chip-text">
              {user.fullName}
              <small>{user.role}</small>
            </div>
            <ChevronDown size={15} className="profile-caret" />
          </button>

          {profileOpen && (
            <div className="profile-menu" role="menu">
              <div className="profile-menu-head">
                <div className="user-avatar lg">{initials}</div>
                <div>
                  <strong>{user.fullName}</strong>
                  <small>{user.email}</small>
                  <span className="role-badge">{user.role}</span>
                </div>
              </div>

              {onOpenQuotes && (
                <button
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => runFromProfile(onOpenQuotes)}
                >
                  <FileText size={16} /> Mis Cotizaciones
                </button>
              )}
              {onOpenIntegrations && (
                <button
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => runFromProfile(onOpenIntegrations)}
                >
                  <Plug size={16} /> Integraciones
                </button>
              )}
              {user.role === 'ADMIN' && onOpenAdmin && (
                <button
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => runFromProfile(onOpenAdmin)}
                >
                  <Settings size={16} /> Administración
                </button>
              )}

              <div className="profile-menu-sep" />

              <button
                className="profile-menu-item danger"
                role="menuitem"
                onClick={() => runFromProfile(logout)}
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
