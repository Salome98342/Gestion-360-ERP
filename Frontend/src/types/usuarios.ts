// ── Sistema de permisos ───────────────────────────────────────────────────────

export const SYSTEM_MODULES = [
  { key: 'ventas',     label: 'Ventas'      },
  { key: 'inventario', label: 'Inventario'  },
  { key: 'compras',    label: 'Compras'     },
  { key: 'usuarios',   label: 'Usuarios'    },
  { key: 'empresas',   label: 'Empresas'    },
  { key: 'reportes',   label: 'Reportes'    },
] as const;

export const SYSTEM_ACTIONS = [
  { key: 'ver',      label: 'Ver'      },
  { key: 'crear',    label: 'Crear'    },
  { key: 'editar',   label: 'Editar'   },
  { key: 'eliminar', label: 'Eliminar' },
] as const;

export type ModuleKey    = typeof SYSTEM_MODULES[number]['key'];
export type ActionKey    = typeof SYSTEM_ACTIONS[number]['key'];
export type ModulePerms  = Record<ActionKey, boolean>;
export type Permissions  = Record<ModuleKey, ModulePerms>;

export function defaultPermissions(): Permissions {
  return {
    ventas:     { ver: false, crear: false, editar: false, eliminar: false },
    inventario: { ver: false, crear: false, editar: false, eliminar: false },
    compras:    { ver: false, crear: false, editar: false, eliminar: false },
    usuarios:   { ver: false, crear: false, editar: false, eliminar: false },
    empresas:   { ver: false, crear: false, editar: false, eliminar: false },
    reportes:   { ver: false, crear: false, editar: false, eliminar: false },
  };
}

export function parsePermissions(json: string | null | undefined): Permissions {
  try {
    const parsed = json ? (JSON.parse(json) as Partial<Permissions>) : {};
    return { ...defaultPermissions(), ...parsed };
  } catch {
    return defaultPermissions();
  }
}

export function serializePermissions(p: Permissions): string {
  return JSON.stringify(p);
}

// ── Modelos ───────────────────────────────────────────────────────────────────

export interface Rol {
  id:             number;
  empresa:        number;
  nombre:         string;
  permisos:       string | null;
  usuarios_count?: number;
}

export interface Sucursal {
  id:      number;
  empresa: number;
  nombre:  string;
  activa:  number;
}

export interface UsuarioRead {
  id:              number;
  empresa:         number;
  sucursal:        number | null;
  sucursal_nombre: string | null;
  rol:             number;
  rol_nombre:      string;
  nombre:          string;
  cedula:          string | null;
  telefono:        string | null;
  correo:          string | null;
  username:        string;
  activo:          number;
}

export interface UsuarioWrite {
  empresa:   number;
  sucursal?: number | null;
  rol:       number;
  nombre:    string;
  cedula?:   string | null;
  telefono?: string | null;
  correo?:   string | null;
  username:  string;
  password?: string;
  activo?:   number;
}

export interface LogActividad {
  id:               number;
  empresa:          number;
  usuario:          number;
  usuario_nombre:   string;
  usuario_username: string;
  accion:           string;
  descripcion:      string | null;
  modulo:           string | null;
  fecha:            string;
}
