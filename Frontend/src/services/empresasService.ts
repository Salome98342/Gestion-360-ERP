import { api } from '../utils/apiClient';
import type { Empresa } from '../types/empresas';

export const empresasService = {
  getEmpresa:    (id: number)                   => api.get<Empresa>(`/empresas/${id}/`),
  updateEmpresa: (id: number, d: Partial<Empresa>) => api.patch<Empresa>(`/empresas/${id}/`, d),
};
