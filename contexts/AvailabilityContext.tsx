import {
  getAvailability,
  setAvailability as setAvailabilityApi,
} from "@/services/providerDashboard";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AvailabilityContextType {
  isAvailable: boolean;
  isLoading: boolean;
  setAvailability: (value: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const AvailabilityContext = createContext<AvailabilityContextType | undefined>(
  undefined,
);

export const useAvailability = () => {
  const ctx = useContext(AvailabilityContext);
  if (ctx === undefined) {
    throw new Error("useAvailability must be used within AvailabilityProvider");
  }
  return ctx;
};

interface AvailabilityProviderProps {
  children: ReactNode;
  /** Only provide when user is a provider (e.g. inside provider tabs). */
  enabled?: boolean;
}

export function AvailabilityProvider({
  children,
  enabled = true,
}: AvailabilityProviderProps) {
  const [isAvailable, setIsAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    try {
      const { isAvailable: value } = await getAvailability();
      setIsAvailable(value);
    } catch {
      // Keep current state on error
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setAvailability = useCallback(
    async (value: boolean) => {
      if (!enabled) return;
      setIsAvailable(value);
      try {
        await setAvailabilityApi(value);
      } catch {
        setIsAvailable(!value);
      }
    },
    [enabled],
  );

  const value: AvailabilityContextType = {
    isAvailable,
    isLoading,
    setAvailability,
    refresh,
  };

  return (
    <AvailabilityContext.Provider value={value}>
      {children}
    </AvailabilityContext.Provider>
  );
}
