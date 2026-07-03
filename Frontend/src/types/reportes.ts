export interface EventoEmpresa {
  id: number;
  empresa: number;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  tipo: string;
  completado: number;
  creado_en: string;
}

export interface EventoEmpresaWrite {
  empresa: number;
  titulo: string;
  descripcion?: string | null;
  fecha: string;
  tipo?: string;
  completado?: number;
}

export interface Caja {
  id: number;
  empresa: number;
  sucursal: number;
  usuario: number;
  fecha_apertura: string;
  monto_inicial: number;
  fecha_cierre: string | null;
  monto_cierre: number | null;
  estado: string;
}

export interface MovimientoCaja {
  id: number;
  caja: number;
  tipo: string;
  concepto: string | null;
  referencia: string | null;
  monto: number;
  fecha: string;
}
