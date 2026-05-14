import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppUser = {
  id: string;
  name: string;
  email: string;
};

const STORAGE_KEY = "berryapi.auth";

type AuthContextValue = {
  hydrated: boolean;
  user: AppUser | null;
  login: (user: AppUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setUser(raw ? (JSON.parse(raw) as AppUser) : null);
    } catch {
      setUser(null);
    } finally {
      setHydrated(true);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      hydrated,
      user,
      login: (nextUser) => {
        setUser(nextUser);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        }
      },
      logout: () => {
        setUser(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      },
    }),
    [hydrated, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
