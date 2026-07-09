import type { AuthUser } from '../types/auth';
import type { ModuleKey, ActionKey } from '../types/usuarios';

/**
 * Verifica si el usuario tiene un permiso específico sobre un módulo.
 *
 * Regla de acceso:
 *   • rol.permisos = null/vacío → acceso completo (rol admin sin restricciones aún configuradas)
 *   • rol.permisos con JSON     → se comprueba el campo exacto
 */
export function can(
  user: AuthUser | null,
  module: ModuleKey,
  action: ActionKey,
): boolean {
  if (!user?.rol) return false;

  const raw = user.rol.permisos;

  // Rol sin permisos configurados → acceso completo (estado admin inicial)
  if (raw == null) return true;
  if (typeof raw !== 'string') return true; // si viene como objeto/dict, ya no intentamos trim
  if (raw.trim() === '') return true;

  try {
    const perms = JSON.parse(raw) as Record<string, Record<string, boolean>>;
    return perms[module]?.[action] ?? false;
  } catch {
    return false;
  }
}

/** Helpers de conveniencia */
export const canView   = (u: AuthUser | null, m: ModuleKey) => can(u, m, 'ver');
export const canCreate = (u: AuthUser | null, m: ModuleKey) => can(u, m, 'crear');
export const canEdit   = (u: AuthUser | null, m: ModuleKey) => can(u, m, 'editar');
export const canDelete = (u: AuthUser | null, m: ModuleKey) => can(u, m, 'eliminar');
