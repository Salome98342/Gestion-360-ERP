import { api } from '../utils/apiClient';
import type { Categoria, TipoCliente, Cliente, Proveedor, Producto, ProductoWrite } from '../types/inventario';

export const inventarioService = {
  // Categorías
  listCategorias:  ()                                       => api.get<Categoria[]>('/categorias/'),
  createCategoria: (d: { empresa: number; nombre: string; descripcion?: string | null }) => api.post<Categoria>('/categorias/', d),
  updateCategoria: (id: number, d: Partial<{ nombre: string; descripcion: string | null; activa: number }>) => api.patch<Categoria>(`/categorias/${id}/`, d),
  deleteCategoria: (id: number)                             => api.delete<void>(`/categorias/${id}/`),

  // Proveedores
  listProveedores:  ()             => api.get<Proveedor[]>('/proveedores/'),
  createProveedor:  (d: Omit<Proveedor, 'id'>) => api.post<Proveedor>('/proveedores/', d),
  updateProveedor:  (id: number, d: Partial<Proveedor>) => api.patch<Proveedor>(`/proveedores/${id}/`, d),
  deleteProveedor:  (id: number)   => api.delete<void>(`/proveedores/${id}/`),

  // Clientes
  listClientes:    ()             => api.get<Cliente[]>('/clientes/'),
  listTiposCliente:()             => api.get<TipoCliente[]>('/tipos-clientes/'),
  createCliente:   (d: Omit<Cliente, 'id'>) => api.post<Cliente>('/clientes/', d),
  updateCliente:   (id: number, d: Partial<Cliente>) => api.patch<Cliente>(`/clientes/${id}/`, d),

  // Productos
  listProductos: (filters?: { categoria?: number; activo?: number; search?: string }) => {
    const p = new URLSearchParams();
    if (filters?.categoria !== undefined) p.set('categoria', String(filters.categoria));
    if (filters?.activo    !== undefined) p.set('activo',    String(filters.activo));
    if (filters?.search)                  p.set('search',    filters.search);
    const q = p.toString();
    return api.get<Producto[]>(`/productos/${q ? '?' + q : ''}`);
  },
  createProducto: (d: ProductoWrite)                   => api.post<Producto>('/productos/', d),
  updateProducto: (id: number, d: Partial<ProductoWrite>) => api.patch<Producto>(`/productos/${id}/`, d),
  deleteProducto: (id: number)                         => api.delete<void>(`/productos/${id}/`),
};
