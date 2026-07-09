import { api } from '../utils/apiClient';
import { getAccessToken } from '../contexts/AuthContext';
import type { UsuarioRead, UsuarioWrite, Rol, Sucursal, LogActividad } from '../types/usuarios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export interface AdminRealtimeNotification {
  kind: 'log' | 'evento';
  id: number;
  fecha: string;
  titulo?: string;
  descripcion?: string | null;
  accion?: string;
  modulo?: string | null;
  usuario_nombre?: string;
  tipo?: string;
}

export const usuariosService = {
  // ── Usuarios ──────────────────────────────────────────────────────────────
  listUsuarios:   ()                                   => api.get<UsuarioRead[]>('/usuarios/'),
  createUsuario:  (data: UsuarioWrite)                 => api.post<UsuarioRead>('/usuarios/', data),
  updateUsuario:  (id: number, data: Partial<UsuarioWrite>) =>
    api.patch<UsuarioRead>(`/usuarios/${id}/`, data),
  toggleActivo:   (id: number) =>
    api.patch<{ id: number; activo: number }>(`/usuarios/${id}/toggle-activo/`, {}),

  // ── Roles ─────────────────────────────────────────────────────────────────
  listRoles:  () => api.get<Rol[]>('/roles/'),
  createRol:  (data: { empresa: number; nombre: string; permisos: string }) =>
    api.post<Rol>('/roles/', data),
  updateRol:  (id: number, data: Partial<{ nombre: string; permisos: string }>) =>
    api.patch<Rol>(`/roles/${id}/`, data),
  deleteRol:  (id: number) => api.delete<void>(`/roles/${id}/`),

  // ── Sucursales (selectores) ────────────────────────────────────────────────
  listSucursales: () => api.get<Sucursal[]>('/sucursales/'),

  // ── Logs ──────────────────────────────────────────────────────────────────
  listLogs: (filters?: {
    usuario?: number;
    modulo?: string;
    q?: string;
    desde?: string;
    hasta?: string;
    incluir_tecnico?: boolean;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.usuario) params.set('usuario', String(filters.usuario));
    if (filters?.modulo)  params.set('modulo',  filters.modulo);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.desde) params.set('desde', filters.desde);
    if (filters?.hasta) params.set('hasta', filters.hasta);
    if (filters?.incluir_tecnico) params.set('incluir_tecnico', '1');
    if (typeof filters?.limit === 'number') params.set('limit', String(filters.limit));
    const q = params.toString();
    return api.get<LogActividad[]>(`/log-actividad/${q ? '?' + q : ''}`);
  },

  subscribeAdminNotifications: (
    onNotification: (payload: AdminRealtimeNotification) => void,
    onError?: () => void,
  ) => {
    const token = getAccessToken();
    if (!token || !BASE_URL) return null;

    const url = `${BASE_URL}/log-actividad/stream/?access_token=${encodeURIComponent(token)}&ventana_minutos=120`;
    const source = new EventSource(url, { withCredentials: false });

    const parseEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as AdminRealtimeNotification;
        onNotification(payload);
      } catch {
        // Silencioso para no romper el stream por payload inválido.
      }
    };

    source.addEventListener('log', parseEvent as EventListener);
    source.addEventListener('evento', parseEvent as EventListener);
    source.onerror = () => {
      if (onError) onError();
    };

    return {
      close: () => source.close(),
    };
  },
};
