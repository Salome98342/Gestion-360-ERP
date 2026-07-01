import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { authService } from '../services/authService';
import type { AuthUser, LoginCredentials } from '../types/auth';

// ── Access token en memoria — nunca en localStorage (seguro vs XSS) ──────────
let _accessToken: string | null = null;
export function getAccessToken(): string | null { return _accessToken; }
export function setAccessToken(token: string | null) { _accessToken = token; }

// ── Helpers JWT ──────────────────────────────────────────────────────────────
function decodeJwt(token: string): Record<string, unknown> {
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch { return {}; }
}

function jwtToUser(p: Record<string, unknown>): AuthUser {
  return {
    id:          p['user_id']    as number,
    username:    p['username']   as string,
    nombre:      p['nombre']     as string,
    correo:      null,
    rol: {
      id:       p['rol_id']   as number,
      nombre:   p['rol_nombre'] as string,
      permisos: (p['permisos'] as string | null) ?? null,
    },
    empresa_id:  p['empresa_id']  as number,
    sucursal_id: p['sucursal_id'] as number | null,
  };
}

// ── Tipos del contexto ───────────────────────────────────────────────────────
interface AuthContextValue {
  user:            AuthUser | null;
  isAuthenticated: boolean;
  isInitializing:  boolean;   // true mientras se restaura la sesión al arrancar
  isLoading:       boolean;   // true durante login / logout
  error:           string | null;
  login:      (creds: LoginCredentials) => Promise<void>;
  logout:     () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,            setUser]            = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing,  setIsInitializing]  = useState(true);
  const [isLoading,       setIsLoading]       = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const mounted = useRef(false);

  // Al montar la app intenta restaurar sesión leyendo la cookie HttpOnly
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    authService
      .refresh()
      .then(({ access }) => {
        _accessToken = access;
        setUser(jwtToUser(decodeJwt(access)));
        setIsAuthenticated(true);
      })
      .catch(() => { /* Sin sesión activa — irá al login */ })
      .finally(() => setIsInitializing(false));
  }, []);

  const login = useCallback(async (creds: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.login(creds);
      _accessToken = data.access;
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (_accessToken) await authService.logout(_accessToken);
    } finally {
      _accessToken = null;
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isInitializing, isLoading, error,
      login, logout, clearError: () => setError(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
