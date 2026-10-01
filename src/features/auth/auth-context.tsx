import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  authStorage,
  isSessionExpired,
  type LoginMethod,
  loginRequest,
  mergeProfile,
  profileRequest,
  rememberedUserStorage,
} from "@/features/auth/auth-api";
import { setHttpAuth } from "@/lib/http";
import type { Session } from "@/types";

export type LoginOptions = {
  redirectTo?: string;
  method?: LoginMethod;
  email?: string;
  password?: string;
};

type AuthContextValue = {
  session: Session | null;
  isAuthenticated: boolean;
  login: (options?: LoginOptions) => Promise<void>;
  /** Frontend-only sign-out: drops the token and the stored session. */
  logout: () => Promise<void>;
  /** Re-reads `GET /auth/profile` for the current token. */
  loadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Restores the stored session so a reload keeps the user signed in, but never
 * with a token the backend already considers expired.
 */
const readStoredSession = (): Session | null => {
  const stored = authStorage.get();
  if (!stored || isSessionExpired(stored)) {
    authStorage.clear();
    return null;
  }
  return stored;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(readStoredSession);
  const sessionRef = useRef<Session | null>(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const rememberCurrentUser = useCallback(() => {
    const current = sessionRef.current;
    if (current?.isAuthenticated) {
      rememberedUserStorage.set({ name: current.user.name, email: current.user.email });
    }
  }, []);

  const clearSession = useCallback(() => {
    rememberCurrentUser();
    authStorage.clear();
    sessionRef.current = null;
    setSession(null);
  }, [rememberCurrentUser]);

  const signOut = useMemo(
    () => () => {
      // The backend exposes no `/auth/logout`, so ending the session here is the
      // complete operation.
      clearSession();
      navigate("/login", { replace: true });
    },
    [clearSession, navigate],
  );

  const logout = useMemo(() => async (): Promise<void> => signOut(), [signOut]);

  useEffect(() => {
    setHttpAuth({
      getToken: () => sessionRef.current?.accessToken ?? null,
      unauthorized: signOut,
    });
  }, [signOut]);

  /**
   * Confirms the current token against `GET /auth/profile` and merges the
   * server's view of the user (id, email, normalized role) into the session.
   * A 401 is already handled by `lib/http`, which clears the session and
   * redirects to `/login`; there is no refresh to attempt.
   */
  const loadProfile = useCallback(async (): Promise<void> => {
    const current = sessionRef.current;
    if (!current?.accessToken) {
      return;
    }
    const profile = await profileRequest();
    if (sessionRef.current?.accessToken !== current.accessToken) {
      // Signed out (or re-authenticated) while the request was in flight.
      return;
    }
    const next = mergeProfile(current, profile);
    sessionRef.current = next;
    authStorage.set(next);
    setSession(next);
  }, []);

  /**
   * Revalidate the active token with `GET /auth/profile`, on boot and after each
   * sign-in. The stored token keeps the session alive across reloads on its own;
   * this only refreshes the cached user. Failures are swallowed on purpose: an
   * expired token has already signed the user out inside `http`, and any other
   * error (500, offline) should not throw away a valid session.
   */
  const activeToken = session?.accessToken;
  useEffect(() => {
    if (!activeToken) {
      return;
    }
    void loadProfile().catch(() => undefined);
  }, [activeToken, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.isAuthenticated),
      login: async (options) => {
        const nextSession = await loginRequest({
          method: options?.method,
          email: options?.email,
          password: options?.password,
        });
        sessionRef.current = nextSession;
        authStorage.set(nextSession);
        rememberedUserStorage.set({
          name: nextSession.user.name,
          email: nextSession.user.email,
        });
        setSession(nextSession);
        navigate(options?.redirectTo ?? "/app/overview", { replace: true });
      },
      logout,
      loadProfile,
    }),
    [navigate, session, logout, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
