import { api } from '../utils/apiClient';
import type {
  EventoEmpresa,
  EventoEmpresaWrite,
  Caja,
  MovimientoCaja,
} from '../types/reportes';

export const reportesService = {
  listEventos: (filters?: { desde?: string; hasta?: string }) => {
    const params = new URLSearchParams();
    if (filters?.desde) params.set('desde', filters.desde);
    if (filters?.hasta) params.set('hasta', filters.hasta);
    const q = params.toString();
    return api.get<EventoEmpresa[]>(`/eventos-empresa/${q ? `?${q}` : ''}`);
  },
  createEvento: (data: EventoEmpresaWrite) => api.post<EventoEmpresa>('/eventos-empresa/', data),
  updateEvento: (id: number, data: Partial<EventoEmpresaWrite>) =>
    api.patch<EventoEmpresa>(`/eventos-empresa/${id}/`, data),

  listCajas: (filters?: { estado?: string; sucursal?: number; usuario?: number }) => {
    const params = new URLSearchParams();
    if (filters?.estado) params.set('estado', filters.estado);
    if (filters?.sucursal) params.set('sucursal', String(filters.sucursal));
    if (filters?.usuario) params.set('usuario', String(filters.usuario));
    const q = params.toString();
    return api.get<Caja[]>(`/cajas/${q ? `?${q}` : ''}`);
  },
  createCaja: (data: { empresa: number; sucursal: number; usuario: number; monto_inicial: number; estado: string }) =>
    api.post<Caja>('/cajas/', data),
  updateCaja: (id: number, data: Partial<{ monto_cierre: number; estado: string }>) =>
    api.patch<Caja>(`/cajas/${id}/`, data),

  listMovimientosCaja: (filters?: { caja?: number; tipo?: string }) => {
    const params = new URLSearchParams();
    if (filters?.caja) params.set('caja', String(filters.caja));
    if (filters?.tipo) params.set('tipo', filters.tipo);
    const q = params.toString();
    return api.get<MovimientoCaja[]>(`/movimiento-caja/${q ? `?${q}` : ''}`);
  },
  createMovimientoCaja: (data: {
    caja: number;
    tipo: string;
    concepto?: string;
    referencia?: string;
    monto: number;
  }) => api.post<MovimientoCaja>('/movimiento-caja/', data),
};
