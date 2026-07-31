import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { CatalogPage } from './pages/CatalogPage';
import { AdminPage } from './pages/admin/AdminPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { SettingsProvider } from './context/SettingsContext';

export default function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'catalog' | 'admin' | 'quotes' | 'integrations'>('catalog');

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const back = () => setView('catalog');

  return (
    <SettingsProvider>
      {view === 'admin' ? (
        <AdminPage onBack={back} />
      ) : view === 'quotes' ? (
        <QuotationsPage onBack={back} />
      ) : view === 'integrations' ? (
        <IntegrationsPage onBack={back} />
      ) : (
        <CatalogPage
          onOpenAdmin={() => setView('admin')}
          onOpenQuotes={() => setView('quotes')}
          onOpenIntegrations={() => setView('integrations')}
        />
      )}
    </SettingsProvider>
  );
}
