export interface Categoria {
  id: number; empresa: number;
  nombre: string; descripcion: string | null; activa: number;
}

export interface TipoCliente {
  id: number; empresa: number; nombre: string;
  limite_credito: number; dias_credito: number; descuento_por_defecto: number;
}

export interface Cliente {
  id: number; empresa: number; nombre: string;
  telefono: string | null; tipo_cliente: number | null; saldo_actual: number; activo: number;
}

export interface Proveedor {
  id: number; empresa: number; nombre: string;
  nit: string | null; telefono: string | null; direccion: string | null; activo: number;
}

export interface Producto {
  id: number; empresa: number;
  categoria: number | null; categoria_nombre: string | null;
  nombre: string; precio_compra: number; precio_venta: number; costo_promedio: number; margen_porcentaje: number;
  stock_actual: number; sucursal: number; sucursal_nombre: string;
  proveedor: number | null; proveedor_nombre: string | null; activo: number;
}

export interface ProductoWrite {
  empresa: number; categoria?: number | null;
  nombre: string; precio_compra: number; precio_venta: number; costo_promedio?: number;
  margen_porcentaje?: number; stock_actual?: number;
  sucursal: number; proveedor?: number | null; activo?: number;
}
