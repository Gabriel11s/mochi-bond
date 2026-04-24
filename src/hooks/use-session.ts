import { useEffect, useState } from "react";

const STORAGE_KEY = "mochi-session";

export interface MochiSession {
  partnerName: string;
  loggedInAt: number;
}

export function useSession() {
  const [session, setSession] = useState<MochiSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    setHydrated(true);
  }, []);

  const login = (partnerName: string) => {
    const s: MochiSession = { partnerName, loggedInAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  };

  const logout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  return { session, hydrated, login, logout };
}
