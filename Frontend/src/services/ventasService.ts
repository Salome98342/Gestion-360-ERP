import { api } from '../utils/apiClient';
import type { Venta, Compra, VentaCreatePayload } from '../types/ventas';

export const ventasService = {
  listVentas:  (estado?: string) => {
    const q = estado ? `?estado=${encodeURIComponent(estado)}` : '';
    return api.get<Venta[]>(`/ventas/${q}`);
  },
  createVenta: (data: VentaCreatePayload) => api.post<Venta>('/ventas/', data),
  listCompras: (estado?: string) => {
    const q = estado ? `?estado=${encodeURIComponent(estado)}` : '';
    return api.get<Compra[]>(`/compras/${q}`);
  },
};
