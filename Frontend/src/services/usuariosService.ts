import { api } from '../utils/apiClient';
import type { UsuarioRead, UsuarioWrite, Rol, Sucursal, LogActividad } from '../types/usuarios';
import type { EventoEmpresa } from '../types/reportes';

const ADMIN_NOTIFICATIONS_POLL_MS = 30000;

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
    let active = true;
    let inFlight = false;
    let lastSeenLogId = 0;
    const seenEventIds = new Set<number>();

    const emitSnapshot = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        const [logs, eventos] = await Promise.all([
          usuariosService.listLogs({ limit: 20 }),
          api.get<EventoEmpresa[]>('/eventos-empresa/'),
        ]);

        if (!active) return;

        logs
          .slice()
          .sort((a, b) => a.id - b.id)
          .forEach((log) => {
            if (log.id <= lastSeenLogId) return;
            lastSeenLogId = log.id;
            onNotification({
              kind: 'log',
              id: log.id,
              fecha: log.fecha,
              accion: log.accion,
              descripcion: log.descripcion,
              modulo: log.modulo,
              usuario_nombre: log.usuario_nombre,
            });
          });

        const now = Date.now();
        const futureWindow = now + (120 * 60 * 1000);
        eventos
          .filter((evento) => evento.completado === 0)
          .sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha))
          .forEach((evento) => {
            const eventAt = new Date(evento.fecha).getTime();
            if (eventAt < now || eventAt > futureWindow || seenEventIds.has(evento.id)) return;
            seenEventIds.add(evento.id);
            onNotification({
              kind: 'evento',
              id: evento.id,
              fecha: evento.fecha,
              titulo: evento.titulo,
              descripcion: evento.descripcion,
              tipo: evento.tipo,
            });
          });
      } catch {
        if (onError) onError();
      } finally {
        inFlight = false;
      }
    };

    void emitSnapshot();
    const timer = window.setInterval(() => {
      void emitSnapshot();
    }, ADMIN_NOTIFICATIONS_POLL_MS);

    return {
      close: () => {
        active = false;
        window.clearInterval(timer);
      },
    };
  },
};
