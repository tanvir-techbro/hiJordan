import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "./api";
import { clearToken, readToken, writeToken } from "./storage";
import type { AuthResponse, MobileUser } from "./types";

type Status = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: Status;
  token: string | null;
  user: MobileUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  updateUser: (user: MobileUser) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MobileUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const stored = await readToken();
      if (!stored) {
        if (!cancelled) setStatus("signedOut");
        return;
      }

      try {
        const result = await api.me(stored);
        if (cancelled) return;
        setToken(stored);
        setUser(result.user);
        setStatus("signedIn");
      } catch {
        await clearToken();
        if (!cancelled) setStatus("signedOut");
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback(async (result: AuthResponse) => {
    await writeToken(result.token);
    setToken(result.token);
    setUser(result.user);
    setStatus("signedIn");
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await apply(await api.login(email, password));
    },
    [apply],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      await apply(await api.register(email, password));
    },
    [apply],
  );

  const signOut = useCallback(async () => {
    await clearToken();
    setToken(null);
    setUser(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      token,
      user,
      signIn,
      signUp,
      updateUser: setUser,
      signOut,
    }),
    [status, token, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
