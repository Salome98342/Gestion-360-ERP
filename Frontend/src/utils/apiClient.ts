import { getAccessToken } from '../contexts/AuthContext';
import { authService } from '../services/authService';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

// ── Deduplicación de refresco ────────────────────────────────────────────────
// Si varios requests llegan simultáneamente con token expirado, solo se hace
// un refresh y todos los demás esperan el mismo Promise.
let _refreshPromise: Promise<string> | null = null;

async function getValidToken(): Promise<string | null> {
  const existing = getAccessToken();
  if (existing) return existing;

  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = authService
    .refresh()
    .then(({ access }) => access)
    .finally(() => { _refreshPromise = null; });

  return _refreshPromise;
}

// ── Cliente HTTP autenticado ─────────────────────────────────────────────────

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = await getValidToken();

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const init: RequestInit = {
    method,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let response = await fetch(`${BASE_URL}${path}`, init);

  // Token expirado → refresco automático + reintento único
  if (response.status === 401) {
    try {
      const { access } = await authService.refresh();
      const retryHeaders = { ...headers, Authorization: `Bearer ${access}` };
      response = await fetch(`${BASE_URL}${path}`, { ...init, headers: retryHeaders });
    } catch {
      window.location.href = '/login';
      throw new Error('Sesión expirada. Redirigiendo al login...');
    }
  }

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Sesión expirada.');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Error ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ── API pública ──────────────────────────────────────────────────────────────
export const api = {
  get:    <T>(path: string)                 => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown)  => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown)  => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body: unknown)  => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                 => request<T>('DELETE', path),
};
