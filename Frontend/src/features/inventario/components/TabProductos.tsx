import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { inventarioService } from '../../../services/inventarioService';
import { useAuth } from '../../../contexts/AuthContext';
import { canCreate, canEdit, canDelete } from '../../../utils/permissions';
import type { Producto, ProductoWrite, Categoria, Proveedor } from '../../../types/inventario';
import type { Sucursal } from '../../../types/usuarios';
import { usuariosService } from '../../../services/usuariosService';
import { confirmAction, notifyError, notifySuccess } from '../../../utils/notify';

interface PForm { nombre:string; precio_compra:string; precio_venta:string; costo_promedio:string; margen_porcentaje:string; stock_actual:string; categoria:string; sucursal:string; proveedor:string; activo:string; }
const EMPTY: PForm = { nombre:'', precio_compra:'', precio_venta:'', costo_promedio:'0', margen_porcentaje:'0', stock_actual:'0', categoria:'', sucursal:'', proveedor:'', activo:'1' };

function stockClass(s: number) { return s <= 0 ? 'stock-zero' : s < 5 ? 'stock-low' : 'stock-ok'; }
function fmt(n: number, currency = 'COP') { return n.toLocaleString('es-CO', { style:'currency', currency, maximumFractionDigits:0 }); }

export default function TabProductos() {
  const { user: me } = useAuth();
  const [productos,   setProductos]   = useState<Producto[]>([]);
  const [categorias,  setCategorias]  = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [sucursales,  setSucursales]  = useState<Sucursal[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string|null>(null);
  const [search,      setSearch]      = useState('');
  const [filtCat,     setFiltCat]     = useState('');
  const [filtActivo,  setFiltActivo]  = useState('');

  const [open,   setOpen]   = useState(false);
  const [editing,setEditing]= useState<Producto|null>(null);
  const [form,   setForm]   = useState<PForm>(EMPTY);
  const [autoMargen, setAutoMargen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mError, setMError] = useState<string|null>(null);

  const calcPrecioVenta = (precioCompra: string, margen: string) => {
    const compraNum = Number(precioCompra);
    const margenNum = Number(margen);
    if (Number.isNaN(compraNum) || compraNum <= 0 || Number.isNaN(margenNum) || margenNum < 0) {
      return '';
    }
    const venta = compraNum * (1 + margenNum / 100);
    return String(Math.round(venta * 100) / 100);
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const filters: {categoria?:number;activo?:number;search?:string} = {};
      if (filtCat)    filters.categoria = Number(filtCat);
      if (filtActivo !== '') filters.activo = Number(filtActivo);
      if (search)     filters.search = search;
      const [prods, cats, provs, sucs] = await Promise.all([
        inventarioService.listProductos(filters),
        inventarioService.listCategorias(),
        inventarioService.listProveedores(),
        usuariosService.listSucursales(),
      ]);
      setProductos(prods); setCategorias(cats); setProveedores(provs); setSucursales(sucs);
    } catch { setError('No se pudieron cargar los productos.'); }
    finally { setLoading(false); }
  }, [search, filtCat, filtActivo]);

  const didLoadRef = useRef(false);
  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    load().catch(() => {});
  }, [load]);

  const f = (k: keyof PForm) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
    const v = e.target.value;

    setForm(p => {
      const next = { ...p, [k]: v };

      if (autoMargen && (k === 'precio_compra' || k === 'margen_porcentaje')) {
        next.precio_venta = calcPrecioVenta(next.precio_compra, next.margen_porcentaje);
      }

      return next;
    });
  };

  const openCreate = () => { setEditing(null); setAutoMargen(true); setForm(EMPTY); setMError(null); setOpen(true); };
  const openEdit   = (p: Producto) => {
    setEditing(p);
    setAutoMargen(false);
    setForm({
      nombre: p.nombre,
      precio_compra: String(p.precio_compra),
      precio_venta: String(p.precio_venta),
      costo_promedio: String(p.costo_promedio),
      margen_porcentaje: String(p.margen_porcentaje),
      stock_actual: String(p.stock_actual),
      categoria: p.categoria ? String(p.categoria) : '',
      sucursal: String(p.sucursal),
      proveedor: p.proveedor ? String(p.proveedor) : '',
      activo: String(p.activo),
    });
    setMError(null); setOpen(true);
  };

  const handleSave = async () => {
    setMError(null);
    if (!form.nombre.trim() || !form.precio_compra || !form.sucursal) { setMError('Nombre, precio de compra y sucursal son obligatorios.'); return; }

    const precioCompraNum = Number(form.precio_compra);
    const margenNum = Number(form.margen_porcentaje);
    const stockNum = Number(form.stock_actual);
    const precioVentaCalculado = calcPrecioVenta(form.precio_compra, form.margen_porcentaje);
    const precioVentaNum = autoMargen ? Number(precioVentaCalculado) : Number(form.precio_venta);

    if (Number.isNaN(precioCompraNum) || precioCompraNum <= 0) { setMError('El precio de compra debe ser mayor a 0.'); return; }
    if (Number.isNaN(margenNum) || margenNum < 0) { setMError('El margen % no puede ser negativo.'); return; }
    if (Number.isNaN(stockNum) || stockNum < 0) { setMError('El stock actual no puede ser negativo.'); return; }
    if (Number.isNaN(precioVentaNum) || precioVentaNum <= 0) { setMError('El precio de venta debe ser mayor a 0.'); return; }

    setSaving(true);
    try {
      const payload: ProductoWrite = {
        empresa: me!.empresa_id,
        nombre: form.nombre.trim(),
        precio_compra: precioCompraNum,
        precio_venta: precioVentaNum,
        costo_promedio: editing ? Number(form.costo_promedio) : undefined,
        margen_porcentaje: margenNum,
        stock_actual: stockNum,
        calcular_por_margen: autoMargen,
        sucursal: Number(form.sucursal),
        categoria: form.categoria ? Number(form.categoria) : null,
        proveedor: form.proveedor ? Number(form.proveedor) : null,
        activo: Number(form.activo),
      };
      if (editing) {
        const u = await inventarioService.updateProducto(editing.id, payload);
        setProductos(p => p.map(x => x.id === u.id ? u : x));
      } else {
        const u = await inventarioService.createProducto(payload);
        setProductos(p => [...p, u]);
      }
      setOpen(false);
      await notifySuccess(editing ? 'Producto actualizado' : 'Producto creado');
    } catch (e) { setMError(e instanceof Error ? e.message : 'Error al guardar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p: Producto) => {
    const ok = await confirmAction('Eliminar producto', `¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`, 'Sí, eliminar');
    if (!ok) return;
    try {
      await inventarioService.deleteProducto(p.id);
      setProductos(ps => ps.filter(x => x.id !== p.id));
      await notifySuccess('Producto eliminado');
    }
    catch { await notifyError('No se pudo eliminar el producto.'); }
  };

  if (loading) return <div className="table-empty">Cargando productos…</div>;
  if (error)   return <div className="table-empty" style={{color:'#f87171'}}>{error}</div>;

  return (
    <>
      <div className="tab-toolbar">
        <div className="tab-toolbar__left">
          <div className="tab-search">
            <Search size={13} className="tab-search__icon"/>
            <input className="tab-search__input" placeholder="Buscar producto…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="tab-select" value={filtCat} onChange={e => setFiltCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className="tab-select" value={filtActivo} onChange={e => setFiltActivo(e.target.value)}>
            <option value="">Todos</option>
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
          </select>
        </div>
        {canCreate(me,'inventario') && <button className="btn-primary" onClick={openCreate}><Plus size={14}/>Nuevo Producto</button>}
      </div>

      <div className="table-wrap">
        <table className="erp-table">
          <thead><tr>
            <th>Producto</th><th>Categoría</th><th>Precio venta</th>
            <th>Costo</th><th>Stock</th><th>Sucursal</th><th>Estado</th>
            {(canEdit(me,'inventario')||canDelete(me,'inventario')) && <th>Acciones</th>}
          </tr></thead>
          <tbody>
            {productos.length === 0
              ? <tr><td colSpan={8} className="table-empty">No se encontraron productos.</td></tr>
              : productos.map(p => (
              <tr key={p.id}>
                <td><strong style={{color:'#e2e8f0'}}>{p.nombre}</strong></td>
                <td>{p.categoria_nombre || <span style={{color:'#374151'}}>—</span>}</td>
                <td className="td-num">{fmt(p.precio_venta)}</td>
                <td className="td-num">{fmt(p.costo_promedio)}</td>
                <td className="td-num"><span className={stockClass(p.stock_actual)}>{p.stock_actual.toLocaleString()}</span></td>
                <td>{p.sucursal_nombre}</td>
                <td><span className={`badge badge--${p.activo ? 'active':'inactive'}`}>{p.activo ? 'Activo':'Inactivo'}</span></td>
                {(canEdit(me,'inventario')||canDelete(me,'inventario')) && (
                  <td><div className="td-actions">
                    {canEdit(me,'inventario')   && <button className="btn-icon btn-icon--warn"   title="Editar"    onClick={() => openEdit(p)}><Edit2 size={13}/></button>}
                    {canDelete(me,'inventario') && <button className="btn-icon btn-icon--danger" title="Eliminar" onClick={() => handleDelete(p)}><Trash2 size={13}/></button>}
                  </div></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setOpen(false); }}>
          <div className="modal-card modal-card--wide">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button className="modal-close" onClick={() => setOpen(false)}><X size={15}/></button>
            </div>
            <div className="modal-body">
              {mError && <div className="modal-error">{mError}</div>}
              {(() => {
                const compra = Number(form.precio_compra);
                const margen = Number(form.margen_porcentaje);
                const costo = Number(form.costo_promedio);
                const venta = autoMargen ? Number(calcPrecioVenta(form.precio_compra, form.margen_porcentaje)) : Number(form.precio_venta);
                if (editing && !Number.isNaN(compra) && compra > 0 && !Number.isNaN(margen) && margen >= 0 && !Number.isNaN(costo) && !Number.isNaN(venta)) {
                  if (venta < costo) {
                    return (
                      <div className="modal-warning" style={{ color: '#f59e0b', marginBottom: 10 }}>
                        Advertencia: el precio de venta es menor al costo promedio.
                      </div>
                    );
                  }
                }
                return null;
              })()}
              <div className="modal-row modal-row-1">
                <div className="m-field"><label className="m-field__label">Nombre *</label>
                  <input className="m-field__input" value={form.nombre} onChange={f('nombre')} placeholder="Nombre del producto"/>
                </div>
              </div>
              <div className="modal-row">
                <div className="m-field"><label className="m-field__label">Precio de compra *</label>
                  <input
                    type="number"
                    className="m-field__input"
                    value={form.precio_compra}
                    onChange={f('precio_compra')}
                    placeholder="0"
                  />
                </div>
                <div className="m-field"><label className="m-field__label">Precio venta *</label>
                  <input
                    type="number"
                    className="m-field__input"
                    value={form.precio_venta}
                    onChange={f('precio_venta')}
                    placeholder="0"
                    disabled={autoMargen}
                  />
                </div>
              </div>

              {editing && (
                <div className="modal-row">
                  <div className="m-field"><label className="m-field__label">Costo promedio</label>
                    <input type="number" className="m-field__input" value={form.costo_promedio} onChange={f('costo_promedio')} placeholder="0"/>
                  </div>
                </div>
              )}
              <div className="modal-row modal-row-3">
                <div className="m-field"><label className="m-field__label">Margen %</label>
                  <input type="number" className="m-field__input" value={form.margen_porcentaje} onChange={f('margen_porcentaje')} placeholder="0"/>
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      setAutoMargen(prev => {
                        const next = !prev;
                        if (next) {
                          setForm(curr => ({ ...curr, precio_venta: calcPrecioVenta(curr.precio_compra, curr.margen_porcentaje) }));
                        }
                        return next;
                      });
                    }}
                  >
                    {autoMargen ? 'Margen automatico: SI' : 'Margen automatico: NO'}
                  </button>
                </div>
                <div className="m-field"><label className="m-field__label">Stock actual</label>
                  <input type="number" min="0" className="m-field__input" value={form.stock_actual} onChange={f('stock_actual')} placeholder="0"/>
                </div>
                <div className="m-field"><label className="m-field__label">Estado</label>
                  <select className="m-field__select" value={form.activo} onChange={f('activo')}>
                    <option value="1">Activo</option><option value="0">Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="modal-row">
                <div className="m-field"><label className="m-field__label">Sucursal *</label>
                  <select className="m-field__select" value={form.sucursal} onChange={f('sucursal')}>
                    <option value="">Seleccionar…</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div className="m-field"><label className="m-field__label">Categoría</label>
                  <select className="m-field__select" value={form.categoria} onChange={f('categoria')}>
                    <option value="">Sin categoría</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-row modal-row-1">
                <div className="m-field"><label className="m-field__label">Proveedor</label>
                  <select className="m-field__select" value={form.proveedor} onChange={f('proveedor')}>
                    <option value="">Sin proveedor</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
