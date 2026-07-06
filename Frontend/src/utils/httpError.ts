export type ApiErrorData = Record<string, unknown> | null;

export class ApiHttpError extends Error {
  status: number;
  data: ApiErrorData;

  constructor(status: number, message: string, data: ApiErrorData = null) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.data = data;
  }
}

export function buildApiErrorMessage(status: number, data: ApiErrorData): string {
  if (data && typeof data.error === 'string' && data.error.trim()) {
    return data.error;
  }

  if (data) {
    const details = Object.entries(data)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
      .join(' | ');

    if (details) return details;
  }

  return `Error ${status}`;
}

export function isLicenseErrorData(data: ApiErrorData): boolean {
  return !!data && data.type === 'LICENSE' && typeof data.status === 'string';
}

export function licenseErrorMessage(statusValue: string): string {
  switch (statusValue) {
    case 'NOT_FOUND':
      return 'La empresa no tiene una licencia registrada. Contacta al administrador para activarla.';
    case 'EXPIRED':
      return 'La licencia de la empresa está vencida. Renueva la licencia para continuar.';
    case 'INACTIVE':
      return 'La licencia de la empresa está inactiva. Actívala o renueva para continuar.';
    default:
      return 'No puedes ingresar porque la licencia de la empresa no está activa.';
  }
}
