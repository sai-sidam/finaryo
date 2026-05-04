import { createContext, useContext } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FinanceAppContextValue = any;

export const FinanceAppContext = createContext<FinanceAppContextValue | null>(null);

export function useFinanceApp(): FinanceAppContextValue {
  const ctx = useContext(FinanceAppContext);
  if (!ctx) {
    throw new Error("useFinanceApp must be used within FinanceAppProvider");
  }
  return ctx;
}
