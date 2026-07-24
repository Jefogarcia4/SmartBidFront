import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { settingsApi } from '../api/services';

interface SettingsState {
  /** false (defecto): precios directos en COP. true: COP = priceUSD * TRM vigente. */
  useTrmPricing: boolean;
  loaded: boolean;
  setUseTrmPricing: (value: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsState | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [useTrmPricing, setUseTrm] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const pricing = await settingsApi.getPricing();
      setUseTrm(pricing.useTrmPricing);
    } catch {
      // sin conexión: se asume el modo por defecto (COP directo)
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setUseTrmPricing = useCallback(async (value: boolean) => {
    const pricing = await settingsApi.setPricing({ useTrmPricing: value });
    setUseTrm(pricing.useTrmPricing);
  }, []);

  const value = useMemo(
    () => ({ useTrmPricing, loaded, setUseTrmPricing, refresh }),
    [useTrmPricing, loaded, setUseTrmPricing, refresh],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de <SettingsProvider>');
  return ctx;
}
