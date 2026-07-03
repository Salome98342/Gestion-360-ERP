export interface Venta {
  id: number; empresa: number;
  cliente: number; cliente_nombre: string; cliente_documento?: string | null; cliente_catalogo_nombre?: string;
  sucursal: number; sucursal_nombre: string;
  usuario: number; usuario_nombre: string;
  fecha: string; fecha_vencimiento?: string | null; subtotal: number;
  descuento_porcentaje: number; descuento_valor: number;
  porcentaje_impuesto: number; valor_impuesto: number; total: number;
  total_pagado: number; metodo_pago: string; monto_recibido: number; cambio: number;
  saldo_pendiente: number; estado: string; utilidad_total: number;
  items?: VentaCreateItem[];
}

export interface Compra {
  id: number; empresa: number;
  proveedor: number; proveedor_nombre: string;
  sucursal: number | null; sucursal_nombre: string | null;
  usuario: number; usuario_nombre: string;
  fecha: string; subtotal: number; impuesto: number; total: number;
  total_pagado: number; saldo_pendiente: number; estado: string;
}

export const VENTA_ESTADOS  = ['PAGADO','CREDITO','ANULADO'] as const;
export const COMPRA_ESTADOS = ['PENDIENTE','PAGADO','ANULADO'] as const;
export type VentaEstado  = typeof VENTA_ESTADOS[number];
export type CompraEstado = typeof COMPRA_ESTADOS[number];

export interface VentaCreateItem {
  producto: number | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario?: number;
  tipo_pago?: string;
}

export interface VentaCreatePayload {
  empresa: number;
  cliente?: number | null;
  cliente_nombre?: string;
  cliente_documento?: string;
  sucursal: number;
  usuario: number;
  descuento_porcentaje: number;
  porcentaje_impuesto: number;
  total_pagado: number;
  metodo_pago: string;
  monto_recibido: number;
  estado: string;
  fecha_vencimiento?: string | null;
  items: VentaCreateItem[];
}

export interface CompraCreateItem {
  producto: number;
  cantidad: number;
  costo_unitario: number;
}

export interface CompraCreatePayload {
  empresa: number;
  proveedor: number;
  sucursal: number;
  usuario: number;
  impuesto: number;
  total_pagado: number;
  estado: string;
  items: CompraCreateItem[];
}
