import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "berryflow.selected-session";

type SessionContextValue = {
  hydrated: boolean;
  selectedSessionId: string | null;
  setSelectedSessionId: (sessionId: string | null) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [selectedSessionId, setSelectedSessionIdState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setSelectedSessionIdState(stored || null);
    setHydrated(true);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      hydrated,
      selectedSessionId,
      setSelectedSessionId: (sessionId) => {
        setSelectedSessionIdState(sessionId);
        if (typeof window !== "undefined") {
          if (sessionId) {
            window.localStorage.setItem(STORAGE_KEY, sessionId);
          } else {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }
      },
    }),
    [hydrated, selectedSessionId],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSelectedSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSelectedSession must be used inside SessionProvider");
  }
  return context;
}
