import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getDatabase } from '@/lib/database';

type DataContextValue = {
  ready: boolean;
  tick: number;
  refresh: () => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getDatabase()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const value = useMemo(
    () => ({ ready, tick, refresh }),
    [ready, tick, refresh]
  );

  return (
    <DataContext.Provider value={value}>{children}</DataContext.Provider>
  );
}

export function useDataRefresh() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataRefresh outside DataProvider');
  return ctx;
}
