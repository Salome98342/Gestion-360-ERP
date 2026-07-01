// ── Tipos de autenticación ─────────────────────────────────────────────────

export interface Rol {
  id: number;
  nombre: string;
  permisos: string | null;
}

export interface AuthUser {
  id: number;
  username: string;
  nombre: string;
  correo: string | null;
  rol: Rol;
  empresa_id: number;
  sucursal_id: number | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}
