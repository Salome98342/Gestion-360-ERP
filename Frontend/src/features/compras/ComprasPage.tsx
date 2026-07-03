import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { canCreate } from '../../utils/permissions';
import { ventasService } from '../../services/ventasService';
import { inventarioService } from '../../services/inventarioService';
import { usuariosService } from '../../services/usuariosService';
import type { Producto, Proveedor } from '../../types/inventario';
import type { Sucursal } from '../../types/usuarios';
import type { Compra, CompraCreateItem, CompraCreatePayload } from '../../types/ventas';
import { COMPRA_ESTADOS } from '../../types/ventas';
import './ComprasPage.css';

function fmt(n: number) {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const ESTADO_CLASS: Record<string, string> = { PAGADO: 'active', PAGADA: 'active', PENDIENTE: 'warn', ANULADO: 'inactive' };
const EMPTY_ITEM = { producto: '', cantidad: '1', costo_unitario: '0' };

export default function ComprasPage() {
  const { user } = useAuth();
  const canAddCompra = canCreate(user, 'compras');
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtEstado, setFiltEstado] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mError, setMError] = useState<string | null>(null);
  const [proveedor, setProveedor] = useState('');
  const [sucursal, setSucursal] = useState('');
  const [estado, setEstado] = useState('PENDIENTE');
  const [impuesto, setImpuesto] = useState('0');
  const [totalPagado, setTotalPagado] = useState('0');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [comprasData, proveedoresData, productosData, sucursalesData] = await Promise.all([
        ventasService.listCompras(filtEstado || undefined),
        inventarioService.listProveedores(),
        inventarioService.listProductos({ activo: 1 }),
        usuariosService.listSucursales(),
      ]);
      setCompras(comprasData);
      setProveedores(proveedoresData);
      setProductos(productosData);
      setSucursales(sucursalesData);
    } catch {
      setError('No se pudieron cargar las compras.');
    } finally {
      setLoading(false);
    }
  }, [filtEstado]);

  useEffect(() => { load(); }, [load]);

  const filtered = compras.filter((compra) =>
    compra.proveedor_nombre.toLowerCase().includes(search.toLowerCase()) ||
    compra.usuario_nombre.toLowerCase().includes(search.toLowerCase())
  );

  const subtotal = items.reduce((acc, item) => acc + toNumber(item.cantidad) * toNumber(item.costo_unitario), 0);
  const total = subtotal + toNumber(impuesto);
  const saldo = total - toNumber(totalPagado);

  const openCreate = () => {
    setProveedor('');
    setSucursal(user?.sucursal_id ? String(user.sucursal_id) : '');
    setEstado('PENDIENTE');
    setImpuesto('0');
    setTotalPagado('0');
    setItems([{ ...EMPTY_ITEM }]);
    setMError(null);
    setOpen(true);
  };

  const updateItem = (index: number, key: keyof typeof EMPTY_ITEM, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      const current = { ...next[index], [key]: value };
      if (key === 'producto') {
        const selected = productos.find((producto) => producto.id === Number(value));
        if (selected) current.costo_unitario = String(selected.costo_promedio || 0);
      }
      next[index] = current;
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index: number) => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const handleSave = async () => {
    setMError(null);
    if (!user) {
      setMError('La sesion no esta disponible.');
      return;
    }
    if (!proveedor || !sucursal) {
      setMError('Debes seleccionar proveedor y sucursal.');
      return;
    }
    if (items.some((item) => !item.producto || toNumber(item.cantidad) <= 0 || toNumber(item.costo_unitario) < 0)) {
      setMError('Cada item debe tener producto, cantidad mayor que cero y costo valido.');
      return;
    }

    setSaving(true);
    try {
      const payload: CompraCreatePayload = {
        empresa: user.empresa_id,
        proveedor: Number(proveedor),
        sucursal: Number(sucursal),
        usuario: user.id,
        impuesto: toNumber(impuesto),
        total_pagado: toNumber(totalPagado),
        estado,
        items: items.map<CompraCreateItem>((item) => ({
          producto: Number(item.producto),
          cantidad: toNumber(item.cantidad),
          costo_unitario: toNumber(item.costo_unitario),
        })),
      };
      const created = await ventasService.createCompra(payload);
      setCompras((prev) => [created, ...prev]);
      setOpen(false);
    } catch (e) {
      setMError(e instanceof Error ? e.message : 'No se pudo registrar la compra.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="upage">
      <div className="upage__header">
        <div>
          <h2 className="upage__title">Compras</h2>
          <p className="upage__subtitle">Historial y registro de ordenes de compra</p>
        </div>
      </div>

      <div className="tab-toolbar">
        <div className="tab-toolbar__left">
          <div className="tab-search">
            <Search size={13} className="tab-search__icon" />
            <input
              className="tab-search__input"
              placeholder="Buscar proveedor o responsable..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="tab-select" value={filtEstado} onChange={(event) => setFiltEstado(event.target.value)}>
            <option value="">Todos los estados</option>
            {COMPRA_ESTADOS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {canAddCompra && (
          <button className="btn-primary" type="button" onClick={openCreate}>
            <Plus size={14} /> Nueva Compra
          </button>
        )}
      </div>

      {error && <div className="table-empty" style={{ color: '#f87171' }}>{error}</div>}
      {loading && <div className="table-empty">Cargando compras...</div>}
      {!loading && !error && (
        <div className="table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Fecha</th><th>Proveedor</th><th>Responsable</th><th>Sucursal</th>
                <th>Subtotal</th><th>Impuesto</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="table-empty">No se encontraron compras.</td></tr>
              ) : filtered.map((compra) => (
                <tr key={compra.id}>
                  <td className="td-mono" style={{ whiteSpace: 'nowrap' }}>{fmtDate(compra.fecha)}</td>
                  <td className="td-name">{compra.proveedor_nombre}</td>
                  <td>{compra.usuario_nombre}</td>
                  <td>{compra.sucursal_nombre || <span style={{ color: '#374151' }}>-</span>}</td>
                  <td className="td-num">{fmt(compra.subtotal)}</td>
                  <td className="td-num" style={{ color: '#fbbf24' }}>{fmt(compra.impuesto)}</td>
                  <td className="td-num" style={{ fontWeight: 700, color: '#e2e8f0' }}>{fmt(compra.total)}</td>
                  <td className="td-num" style={{ color: '#4ade80' }}>{fmt(compra.total_pagado)}</td>
                  <td className="td-num" style={{ color: compra.saldo_pendiente > 0 ? '#f87171' : '#94a3b8' }}>{fmt(compra.saldo_pendiente)}</td>
                  <td><span className={`badge badge--${ESTADO_CLASS[compra.estado] || 'inactive'}`}>{compra.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div className="modal-card modal-card--wide venta-modal">
            <div className="modal-header">
              <h3 className="modal-title">Nueva Compra</h3>
              <button className="modal-close" type="button" onClick={() => setOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div className="modal-body venta-form">
              {mError && <div className="modal-error">{mError}</div>}
              <div className="modal-row">
                <div className="m-field">
                  <label className="m-field__label">Proveedor *</label>
                  <select className="m-field__select" value={proveedor} onChange={(event) => setProveedor(event.target.value)}>
                    <option value="">Seleccionar...</option>
                    {proveedores.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                  </select>
                </div>
                <div className="m-field">
                  <label className="m-field__label">Sucursal *</label>
                  <select className="m-field__select" value={sucursal} onChange={(event) => setSucursal(event.target.value)}>
                    <option value="">Seleccionar...</option>
                    {sucursales.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-row modal-row-3">
                <div className="m-field">
                  <label className="m-field__label">Estado</label>
                  <select className="m-field__select" value={estado} onChange={(event) => setEstado(event.target.value)}>
                    {COMPRA_ESTADOS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div className="m-field">
                  <label className="m-field__label">Impuesto</label>
                  <input className="m-field__input" type="number" value={impuesto} onChange={(event) => setImpuesto(event.target.value)} />
                </div>
                <div className="m-field">
                  <label className="m-field__label">Total pagado</label>
                  <input className="m-field__input" type="number" value={totalPagado} onChange={(event) => setTotalPagado(event.target.value)} />
                </div>
              </div>

              <div className="venta-section">
                <div className="venta-section__header">
                  <div>
                    <h4 className="venta-section__title">Items de la compra</h4>
                    <p className="venta-section__subtitle">El stock y costo promedio se actualizan al guardar.</p>
                  </div>
                  <button className="btn-primary" type="button" onClick={addItem}>
                    <Plus size={14} /> Agregar item
                  </button>
                </div>

                <div className="venta-items">
                  {items.map((item, index) => (
                    <div key={`${index}-${item.producto}`} className="venta-item">
                      <div className="m-field">
                        <label className="m-field__label">Producto</label>
                        <select className="m-field__select" value={item.producto} onChange={(event) => updateItem(index, 'producto', event.target.value)}>
                          <option value="">Seleccionar...</option>
                          {productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}
                        </select>
                      </div>
                      <div className="m-field">
                        <label className="m-field__label">Cantidad</label>
                        <input className="m-field__input" type="number" value={item.cantidad} onChange={(event) => updateItem(index, 'cantidad', event.target.value)} />
                      </div>
                      <div className="m-field">
                        <label className="m-field__label">Costo unitario</label>
                        <input className="m-field__input" type="number" value={item.costo_unitario} onChange={(event) => updateItem(index, 'costo_unitario', event.target.value)} />
                      </div>
                      <div className="venta-item__meta">
                        <div className="venta-item__summary">
                          <span>Subtotal</span>
                          <strong>{fmt(toNumber(item.cantidad) * toNumber(item.costo_unitario))}</strong>
                        </div>
                        <button className="btn-icon btn-icon--danger venta-item__remove" type="button" onClick={() => removeItem(index)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="venta-summary">
                <div className="venta-summary__card"><span>Subtotal</span><strong>{fmt(subtotal)}</strong></div>
                <div className="venta-summary__card"><span>Impuesto</span><strong>{fmt(toNumber(impuesto))}</strong></div>
                <div className="venta-summary__card"><span>Total</span><strong>{fmt(total)}</strong></div>
                <div className="venta-summary__card"><span>Pagado</span><strong>{fmt(toNumber(totalPagado))}</strong></div>
                <div className="venta-summary__card venta-summary__card--accent"><span>Saldo</span><strong>{fmt(saldo)}</strong></div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" type="button" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-save" type="button" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Crear compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
