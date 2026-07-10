import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { authService } from '../services/authService';
import type { AuthUser, LoginCredentials } from '../types/auth';
import { AuthContext } from './authContextInternal';
import { getAccessToken, setAccessToken } from './authTokenStore';

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
      permisos: (p['permisos'] as string | Record<string, unknown> | null) ?? null,
    },
    empresa_id:  p['empresa_id']  as number,
    sucursal_id: p['sucursal_id'] as number | null,
  };
}

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
        setAccessToken(access);
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
      setAccessToken(data.access);
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
      const accessToken = getAccessToken();
      if (accessToken) await authService.logout(accessToken);
    } finally {
      setAccessToken(null);
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
