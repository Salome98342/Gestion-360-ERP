export interface Empresa {
  id: number; nombre: string; nit: string | null;
  direccion: string | null; telefono: string | null;
  moneda: string; porcentaje_impuesto: number; activa: number;
}
