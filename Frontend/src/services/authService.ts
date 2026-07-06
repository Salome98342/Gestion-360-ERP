import type { LoginCredentials, LoginResponse } from '../types/auth';
import { ApiHttpError, buildApiErrorMessage } from '../utils/httpError';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

if (!BASE_URL) {
  console.warn('[authService] VITE_API_BASE_URL no está definida en .env');
}

// ── Cliente HTTP interno ───────────────────────────────────────────────────

async function post<T>(
  path: string,
  body?: unknown,
  accessToken?: string,
): Promise<T> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include', // Envía y recibe cookies HttpOnly (refresh token)
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    throw new ApiHttpError(response.status, buildApiErrorMessage(response.status, data), data);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ── Servicio de autenticación ──────────────────────────────────────────────

export const authService = {
  /**
   * Inicia sesión con credenciales corporativas.
   * El refresh token queda en una cookie HttpOnly (nunca accesible desde JS).
   * El access token (30 min) se devuelve en el body para guardarse en memoria.
   */
  login(credentials: LoginCredentials): Promise<LoginResponse> {
    return post<LoginResponse>('/auth/login/', credentials);
  },

  /**
   * Solicita un nuevo access token leyendo el refresh token de la cookie.
   * Llamar al iniciar la app para restaurar la sesión sin pedir login.
   */
  refresh(): Promise<{ access: string }> {
    return post<{ access: string }>('/auth/refresh/');
  },

  /**
   * Cierra sesión: invalida el refresh token y elimina la cookie del navegador.
   */
  logout(accessToken: string): Promise<void> {
    return post<void>('/auth/logout/', undefined, accessToken);
  },
};
