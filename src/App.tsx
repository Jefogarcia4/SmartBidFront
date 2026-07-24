import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { CatalogPage } from './pages/CatalogPage';
import { AdminPage } from './pages/admin/AdminPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { SettingsProvider } from './context/SettingsContext';

export default function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'catalog' | 'admin' | 'quotes'>('catalog');

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <SettingsProvider>
      {view === 'admin' ? (
        <AdminPage onBack={() => setView('catalog')} />
      ) : view === 'quotes' ? (
        <QuotationsPage onBack={() => setView('catalog')} />
      ) : (
        <CatalogPage onOpenAdmin={() => setView('admin')} onOpenQuotes={() => setView('quotes')} />
      )}
    </SettingsProvider>
  );
}
