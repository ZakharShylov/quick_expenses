import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getCurrencySetting, setCurrencySetting } from '@/src/db/settings';
import { CurrencyCode } from '@/src/utils/money';

type CurrencyContextValue = {
  currencyCode: CurrencyCode;
  setCurrencyCode: (nextCurrency: CurrencyCode) => Promise<void>;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCodeState] = useState<CurrencyCode>('EUR');

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const savedCurrency = await getCurrencySetting();
        if (!mounted) return;
        setCurrencyCodeState(savedCurrency);
      } catch {
        if (!mounted) return;
        setCurrencyCodeState('EUR');
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setCurrencyCode = useCallback(async (nextCurrency: CurrencyCode) => {
    setCurrencyCodeState(nextCurrency);

    try {
      await setCurrencySetting(nextCurrency);
    } catch {
      // Keep UI state optimistic even if persistence fails once.
    }
  }, []);

  const value = useMemo(
    () => ({
      currencyCode,
      setCurrencyCode,
    }),
    [currencyCode, setCurrencyCode]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }

  return context;
}
