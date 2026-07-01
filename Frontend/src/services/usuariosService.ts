import { api } from '../utils/apiClient';
import type { UsuarioRead, UsuarioWrite, Rol, Sucursal, LogActividad } from '../types/usuarios';

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
  listLogs: (filters?: { usuario?: number; modulo?: string }) => {
    const params = new URLSearchParams();
    if (filters?.usuario) params.set('usuario', String(filters.usuario));
    if (filters?.modulo)  params.set('modulo',  filters.modulo);
    const q = params.toString();
    return api.get<LogActividad[]>(`/log-actividad/${q ? '?' + q : ''}`);
  },
};
