import type { AuthUser } from '../types/auth';
import type { ModuleKey, ActionKey } from '../types/usuarios';

/**
 * Verifica si el usuario tiene un permiso específico sobre un módulo.
 *
 * Regla de acceso:
 *   • rol.permisos = null/vacío → acceso denegado
 *   • rol.permisos con JSON     → se comprueba el campo exacto
 */
export function can(
  user: AuthUser | null,
  module: ModuleKey,
  action: ActionKey,
): boolean {
  if (!user?.rol) return false;

  const raw = user.rol.permisos;

  if (raw == null) return false;
  if (typeof raw !== 'string') {
    const perms = raw as Record<string, Record<string, boolean>>;
    if ((perms as Record<string, unknown>).__admin__ === true) return true;
    return perms[module]?.[action] ?? false;
  }
  if (raw.trim() === '') return false;

  const txt = raw.trim().toLowerCase();
  if (txt === 'all' || txt === '*' || txt === 'admin') return true;

  try {
    const perms = JSON.parse(raw) as Record<string, Record<string, boolean>> & { __admin__?: boolean };
    if (perms.__admin__ === true) return true;
    return perms[module]?.[action] ?? false;
  } catch {
    return false;
  }
}

export function isAdminUser(user: AuthUser | null): boolean {
  if (!user?.rol) return false;
  const roleName = String(user.rol.nombre || '').toLowerCase();
  if (roleName.includes('admin')) return true;

  const raw = user.rol.permisos;
  if (raw == null) return false;

  if (typeof raw === 'string') {
    const txt = raw.trim().toLowerCase();
    if (txt === 'all' || txt === '*' || txt === 'admin') return true;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return parsed.__admin__ === true;
    } catch {
      return false;
    }
  }

  return (raw as Record<string, unknown>).__admin__ === true;
}

/** Helpers de conveniencia */
export const canView   = (u: AuthUser | null, m: ModuleKey) => can(u, m, 'ver');
export const canCreate = (u: AuthUser | null, m: ModuleKey) => can(u, m, 'crear');
export const canEdit   = (u: AuthUser | null, m: ModuleKey) => can(u, m, 'editar');
export const canDelete = (u: AuthUser | null, m: ModuleKey) => can(u, m, 'eliminar');
