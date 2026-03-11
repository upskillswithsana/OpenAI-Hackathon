"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
} from "react";

import { fetchDemoUsers, loginDemoUser } from "@/lib/api";
import type { UserSummary } from "@/lib/types";

type Session = {
  token: string;
  user: UserSummary;
};

type SessionContextValue = {
  demoUsers: UserSummary[];
  session: Session | null;
  loading: boolean;
  bootstrapError: string | null;
  loginAs: (email: string) => Promise<void>;
  logout: () => void;
};

const STORAGE_KEY = "ut-ambassador-session";

const SessionContext = createContext<SessionContextValue | null>(null);

function persistSessionToStorage(nextSession: Session | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (nextSession) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [demoUsers, setDemoUsers] = useState<UserSummary[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      try {
        setSession(JSON.parse(stored) as Session);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    void fetchDemoUsers()
      .then((users) => {
        setDemoUsers(users);
        setBootstrapError(null);
        if (!stored) {
          const preferred = users.find((user) => user.role === "student") ?? users[0];
          if (preferred) {
            startTransition(() => {
              void loginDemoUser(preferred.email).then((result) => {
                const nextSession = {
                  token: result.access_token,
                  user: result.user,
                };
                setSession(nextSession);
                persistSessionToStorage(nextSession);
              });
            });
          }
        }
      })
      .catch(() => {
        setBootstrapError("Unable to load demo users.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function loginAs(email: string) {
    const result = await loginDemoUser(email);
    const nextSession = { token: result.access_token, user: result.user };
    setSession(nextSession);
    persistSessionToStorage(nextSession);
  }

  function logout() {
    setSession(null);
    persistSessionToStorage(null);
  }

  const value = {
    demoUsers,
    session,
    loading,
    bootstrapError,
    loginAs,
    logout,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }
  return context;
}
