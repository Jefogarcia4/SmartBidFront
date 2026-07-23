import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { CatalogPage } from './pages/CatalogPage';
import { AdminPage } from './pages/admin/AdminPage';
import { QuotationsPage } from './pages/QuotationsPage';

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

  if (view === 'admin') return <AdminPage onBack={() => setView('catalog')} />;
  if (view === 'quotes') return <QuotationsPage onBack={() => setView('catalog')} />;
  return (
    <CatalogPage onOpenAdmin={() => setView('admin')} onOpenQuotes={() => setView('quotes')} />
  );
}
