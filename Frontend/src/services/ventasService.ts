import { api } from '../utils/apiClient';
import type { Venta, Compra, VentaCreatePayload, CompraCreatePayload } from '../types/ventas';

export const ventasService = {
  listVentas:  (estado?: string) => {
    const q = estado ? `?estado=${encodeURIComponent(estado)}` : '';
    return api.get<Venta[]>(`/ventas/${q}`);
  },
  createVenta: (data: VentaCreatePayload) => api.post<Venta>('/ventas/', data),
  updateVenta: (id: number, data: VentaCreatePayload) => api.patch<Venta>(`/ventas/${id}/`, data),
  downloadFactura: (id: number) => api.download(`/ventas/${id}/factura/`),
  listCompras: (estado?: string) => {
    const q = estado ? `?estado=${encodeURIComponent(estado)}` : '';
    return api.get<Compra[]>(`/compras/${q}`);
  },
  createCompra: (data: CompraCreatePayload) => api.post<Compra>('/compras/', data),
};
