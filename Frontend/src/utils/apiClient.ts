import { getAccessToken, setAccessToken } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { ApiHttpError, buildApiErrorMessage } from './httpError';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

// ── Refresco deduplicado ──────────────────────────────────────────────────────
// Un único Promise compartido para todos los requests que necesiten refrescar
// el token al mismo tiempo (evita múltiples llamadas a /auth/refresh/).
let _pendingRefresh: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (_pendingRefresh) return _pendingRefresh;
  _pendingRefresh = authService
    .refresh()
    .then(({ access }) => { setAccessToken(access); return access; })
    .finally(() => { _pendingRefresh = null; });
  return _pendingRefresh;
}

async function getValidToken(): Promise<string | null> {
  const existing = getAccessToken();
  if (existing) return existing;
  try { return await refreshAccessToken(); } catch { return null; }
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

  // Token expirado → refresco único compartido + reintento
  if (response.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      response = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    } catch {
      setAccessToken(null);
      window.location.href = '/login';
      throw new Error('Sesión expirada. Redirigiendo al login...');
    }
  }

  if (response.status === 401) {
    setAccessToken(null);
    window.location.href = '/login';
    throw new Error('Sesión expirada.');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => null) as Record<string, unknown> | null;
    throw new ApiHttpError(response.status, buildApiErrorMessage(response.status, err), err);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function download(path: string): Promise<Blob> {
  const token = await getValidToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  if (response.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      response = await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        credentials: 'include',
        headers: { Authorization: `Bearer ${newToken}` },
      });
    } catch {
      setAccessToken(null);
      window.location.href = '/login';
      throw new Error('Sesion expirada. Redirigiendo al login...');
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => null) as Record<string, unknown> | null;
    throw new ApiHttpError(response.status, buildApiErrorMessage(response.status, err), err);
  }

  return response.blob();
}

// ── API pública ──────────────────────────────────────────────────────────────
export const api = {
  get:    <T>(path: string)                 => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown)  => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown)  => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body: unknown)  => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                 => request<T>('DELETE', path),
  download,
};

