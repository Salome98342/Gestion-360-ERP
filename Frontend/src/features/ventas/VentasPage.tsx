import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ban, Download, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { canCreate, canEdit } from '../../utils/permissions';
import { ventasService } from '../../services/ventasService';
import { inventarioService } from '../../services/inventarioService';
import { usuariosService } from '../../services/usuariosService';
import type { Producto } from '../../types/inventario';
import type { Sucursal } from '../../types/usuarios';
import type { Venta, VentaCreateItem, VentaCreatePayload } from '../../types/ventas';
import './VentasPage.css';

const PAYMENT_METHODS = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO'] as const;

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

type VentaItemForm = {
  producto: string;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  costo_unitario: string;
};

type VentaForm = {
  cliente_nombre: string;
  cliente_documento: string;
  sucursal: string;
  descuento_porcentaje: string;
  porcentaje_impuesto: string;
  metodo_pago: typeof PAYMENT_METHODS[number];
  monto_recibido: string;
};

const ESTADO_CLASS: Record<string, string> = {
  PAGADO: 'active',
  CREDITO: 'warn',
  ANULADO: 'inactive',
};

const EMPTY_ITEM: VentaItemForm = {
  producto: '',
  descripcion: '',
  cantidad: '1',
  precio_unitario: '0',
  costo_unitario: '0',
};

const EMPTY_FORM: VentaForm = {
  cliente_nombre: '',
  cliente_documento: '',
  sucursal: '',
  descuento_porcentaje: '0',
  porcentaje_impuesto: '0',
  metodo_pago: 'EFECTIVO',
  monto_recibido: '0',
};

export default function VentasPage() {
  const { user: me } = useAuth();
  const canAddVenta = canCreate(me, 'ventas');
  const canUpdateVenta = canEdit(me, 'ventas');

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null);
  const [saving, setSaving] = useState(false);
  const [mError, setMError] = useState<string | null>(null);
  const [form, setForm] = useState<VentaForm>(EMPTY_FORM);
  const [items, setItems] = useState<VentaItemForm[]>([{ ...EMPTY_ITEM }]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ventasData, productosData, sucursalesData] = await Promise.all([
        ventasService.listVentas(),
        inventarioService.listProductos({ activo: 1 }),
        usuariosService.listSucursales(),
      ]);
      setVentas(ventasData);
      setProductos(productosData);
      setSucursales(sucursalesData);
    } catch {
      setError('No se pudieron cargar las ventas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const productById = useMemo(() => {
    const map = new Map<number, Producto>();
    productos.forEach((producto) => map.set(producto.id, producto));
    return map;
  }, [productos]);

  const computed = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + toNumber(item.cantidad) * toNumber(item.precio_unitario), 0);
    const descuentoValor = subtotal * toNumber(form.descuento_porcentaje) / 100;
    const subtotalConDescuento = subtotal - descuentoValor;
    const valorImpuesto = subtotalConDescuento * toNumber(form.porcentaje_impuesto) / 100;
    const total = subtotalConDescuento + valorImpuesto;
    const recibido = form.metodo_pago === 'CREDITO' ? 0 : (form.metodo_pago === 'EFECTIVO' ? toNumber(form.monto_recibido) : total);
    const totalPagado = Math.min(Math.max(recibido, 0), total);
    const cambio = form.metodo_pago === 'EFECTIVO' ? Math.max(0, recibido - total) : 0;
    const saldoPendiente = Math.max(0, total - totalPagado);
    const estado = saldoPendiente > 0 ? 'CREDITO' : 'PAGADO';
    return { subtotal, descuentoValor, valorImpuesto, total, recibido, totalPagado, cambio, saldoPendiente, estado };
  }, [items, form.descuento_porcentaje, form.porcentaje_impuesto, form.metodo_pago, form.monto_recibido]);

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      sucursal: me?.sucursal_id ? String(me.sucursal_id) : '',
    });
    setItems([{ ...EMPTY_ITEM }]);
    setMError(null);
  };

  const openCreate = () => {
    setEditingVenta(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (venta: Venta) => {
    setEditingVenta(venta);
    setForm({
      cliente_nombre: venta.cliente_nombre === 'Consumidor final' ? '' : (venta.cliente_nombre ?? ''),
      cliente_documento: venta.cliente_documento ?? '',
      sucursal: String(venta.sucursal),
      descuento_porcentaje: String(venta.descuento_porcentaje ?? 0),
      porcentaje_impuesto: String(venta.porcentaje_impuesto ?? 0),
      metodo_pago: (PAYMENT_METHODS.includes(venta.metodo_pago as typeof PAYMENT_METHODS[number])
        ? venta.metodo_pago
        : 'EFECTIVO') as typeof PAYMENT_METHODS[number],
      monto_recibido: String(venta.monto_recibido ?? venta.total_pagado ?? 0),
    });
    setItems((venta.items?.length ? venta.items : [EMPTY_ITEM]).map((item) => ({
      producto: item.producto ? String(item.producto) : '',
      descripcion: item.descripcion ?? '',
      cantidad: String(item.cantidad),
      precio_unitario: String(item.precio_unitario),
      costo_unitario: String(item.costo_unitario ?? 0),
    })));
    setMError(null);
    setOpen(true);
  };

  const updateForm = (key: keyof VentaForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'metodo_pago' && value !== 'EFECTIVO' ? { monto_recibido: '0' } : {}),
    }));
  };

  const updateItem = (index: number, key: keyof VentaItemForm, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      const current = { ...next[index], [key]: value };
      if (key === 'producto') {
        const selected = value ? productById.get(Number(value)) : undefined;
        if (selected) {
          current.descripcion = selected.nombre;
          current.precio_unitario = String(selected.precio_venta);
          current.costo_unitario = String(selected.costo_promedio);
        }
      }
      next[index] = current;
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index: number) => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const payloadFromForm = (estado = computed.estado): VentaCreatePayload => ({
    empresa: me?.empresa_id ?? 0,
    cliente: null,
    cliente_nombre: form.cliente_nombre.trim() || 'Consumidor final',
    cliente_documento: form.cliente_documento.trim(),
    sucursal: Number(form.sucursal),
    usuario: me?.id ?? 0,
    descuento_porcentaje: toNumber(form.descuento_porcentaje),
    porcentaje_impuesto: toNumber(form.porcentaje_impuesto),
    total_pagado: estado === 'ANULADO' ? 0 : computed.totalPagado,
    metodo_pago: form.metodo_pago,
    monto_recibido: estado === 'ANULADO' ? 0 : computed.recibido,
    estado,
    fecha_vencimiento: null,
    items: items.map<VentaCreateItem>((item) => ({
      producto: item.producto ? Number(item.producto) : null,
      descripcion: item.descripcion.trim(),
      cantidad: toNumber(item.cantidad),
      precio_unitario: toNumber(item.precio_unitario),
      costo_unitario: toNumber(item.costo_unitario),
      tipo_pago: form.metodo_pago,
    })),
  });

  const handleSave = async () => {
    setMError(null);
    if (!me) {
      setMError('La sesion no esta disponible.');
      return;
    }
    if (!form.sucursal) {
      setMError('Selecciona la sucursal de la venta.');
      return;
    }
    if (!items.length || items.some((item) => !toNumber(item.cantidad) || toNumber(item.precio_unitario) < 0)) {
      setMError('Cada item debe tener cantidad mayor que cero y precio valido.');
      return;
    }
    if (items.some((item) => !item.producto && !item.descripcion.trim())) {
      setMError('Cada item debe tener producto o descripcion.');
      return;
    }
    if (form.metodo_pago === 'EFECTIVO' && computed.total > 0 && computed.recibido <= 0) {
      setMError('Ingresa el efectivo recibido.');
      return;
    }

    setSaving(true);
    try {
      if (editingVenta) {
        const updated = await ventasService.updateVenta(editingVenta.id, payloadFromForm());
        setVentas((prev) => prev.map((venta) => (venta.id === updated.id ? updated : venta)));
      } else {
        const created = await ventasService.createVenta(payloadFromForm());
        setVentas((prev) => [created, ...prev]);
      }
      setOpen(false);
      setEditingVenta(null);
    } catch (e) {
      setMError(e instanceof Error ? e.message : 'No se pudo guardar la venta.');
    } finally {
      setSaving(false);
    }
  };

  const handleAnular = async (venta: Venta) => {
    if (!canUpdateVenta) return;
    setSaving(true);
    try {
      const payload: VentaCreatePayload = {
        empresa: venta.empresa,
        cliente: venta.cliente,
        cliente_nombre: venta.cliente_nombre,
        cliente_documento: venta.cliente_documento ?? '',
        sucursal: venta.sucursal,
        usuario: venta.usuario,
        descuento_porcentaje: venta.descuento_porcentaje,
        porcentaje_impuesto: venta.porcentaje_impuesto,
        total_pagado: 0,
        metodo_pago: venta.metodo_pago,
        monto_recibido: 0,
        estado: 'ANULADO',
        fecha_vencimiento: venta.fecha_vencimiento ?? null,
        items: (venta.items ?? []).map((item) => ({
          producto: item.producto,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          costo_unitario: item.costo_unitario,
          tipo_pago: item.tipo_pago,
        })),
      };
      const updated = await ventasService.updateVenta(venta.id, payload);
      setVentas((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anular la venta.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadFactura = async (venta: Venta) => {
    try {
      const blob = await ventasService.downloadFactura(venta.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `factura-venta-${venta.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo descargar la factura.');
    }
  };

  const filtered = ventas.filter((venta) => {
    const target = `${venta.cliente_nombre ?? ''} ${venta.cliente_documento ?? ''} ${venta.usuario_nombre}`.toLowerCase();
    return target.includes(search.toLowerCase());
  });

  return (
    <div className="upage">
      <div className="upage__header">
        <div>
          <h2 className="upage__title">Ventas</h2>
          <p className="upage__subtitle">Venta rapida con cliente opcional, pagos y cambio automatico</p>
        </div>
      </div>

      <div className="tab-toolbar">
        <div className="tab-toolbar__left">
          <div className="tab-search">
            <Search size={13} className="tab-search__icon" />
            <input
              className="tab-search__input"
              placeholder="Buscar cliente, documento o vendedor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        {canAddVenta && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={14} /> Nueva Venta
          </button>
        )}
      </div>

      {error && <div className="table-empty" style={{ color: '#f87171' }}>{error}</div>}
      {loading && <div className="table-empty">Cargando ventas...</div>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Pago</th>
                <th>Total</th>
                <th>Recibido</th>
                <th>Cambio</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="table-empty">No se encontraron ventas.</td></tr>
              ) : filtered.map((venta) => (
                <tr key={venta.id}>
                  <td className="td-mono" style={{ whiteSpace: 'nowrap' }}>{fmtDate(venta.fecha)}</td>
                  <td className="td-name">
                    {venta.cliente_nombre || 'Consumidor final'}
                    {venta.cliente_documento && <span className="td-subtext">{venta.cliente_documento}</span>}
                  </td>
                  <td>{venta.metodo_pago}</td>
                  <td className="td-num" style={{ fontWeight: 700, color: '#e2e8f0' }}>{fmt(venta.total)}</td>
                  <td className="td-num">{fmt(venta.monto_recibido || venta.total_pagado)}</td>
                  <td className="td-num" style={{ color: venta.cambio > 0 ? '#4ade80' : '#94a3b8' }}>{fmt(venta.cambio || 0)}</td>
                  <td className="td-num" style={{ color: venta.saldo_pendiente > 0 ? '#f87171' : '#94a3b8' }}>{fmt(venta.saldo_pendiente)}</td>
                  <td><span className={`badge badge--${ESTADO_CLASS[venta.estado] || 'inactive'}`}>{venta.estado}</span></td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon" type="button" title="Descargar factura" onClick={() => handleDownloadFactura(venta)}>
                        <Download size={13} />
                      </button>
                      {canUpdateVenta && (
                        <button className="btn-icon" type="button" title="Editar venta" onClick={() => openEdit(venta)}>
                          <Pencil size={13} />
                        </button>
                      )}
                      {canUpdateVenta && venta.estado !== 'ANULADO' && (
                        <button className="btn-icon btn-icon--danger" type="button" title="Anular venta" disabled={saving} onClick={() => handleAnular(venta)}>
                          <Ban size={13} />
                        </button>
                      )}
                    </div>
                  </td>
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
              <h3 className="modal-title">{editingVenta ? `Editar venta #${editingVenta.id}` : 'Nueva Venta'}</h3>
              <button className="modal-close" onClick={() => setOpen(false)}><X size={15} /></button>
            </div>

            <div className="modal-body venta-form">
              {mError && <div className="modal-error">{mError}</div>}

              <div className="modal-row modal-row-3">
                <div className="m-field">
                  <label className="m-field__label">Cliente</label>
                  <input className="m-field__input" value={form.cliente_nombre} onChange={updateForm('cliente_nombre')} placeholder="Consumidor final" />
                </div>
                <div className="m-field">
                  <label className="m-field__label">Documento</label>
                  <input className="m-field__input" value={form.cliente_documento} onChange={updateForm('cliente_documento')} placeholder="Opcional" />
                </div>
                <div className="m-field">
                  <label className="m-field__label">Sucursal *</label>
                  <select className="m-field__select" value={form.sucursal} onChange={updateForm('sucursal')}>
                    <option value="">Seleccionar...</option>
                    {sucursales.map((sucursal) => <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="venta-section">
                <div className="venta-section__header">
                  <div>
                    <h4 className="venta-section__title">Productos</h4>
                    <p className="venta-section__subtitle">Selecciona productos o escribe una descripcion libre.</p>
                  </div>
                  <button className="btn-primary" type="button" onClick={addItem}>
                    <Plus size={14} /> Agregar item
                  </button>
                </div>

                <div className="venta-items">
                  {items.map((item, index) => {
                    const subtotalItem = toNumber(item.cantidad) * toNumber(item.precio_unitario);
                    return (
                      <div key={`${index}-${item.producto}`} className="venta-item venta-item--simple">
                        <div className="m-field">
                          <label className="m-field__label">Producto</label>
                          <select className="m-field__select" value={item.producto} onChange={(event) => updateItem(index, 'producto', event.target.value)}>
                            <option value="">Sin producto</option>
                            {productos.map((producto) => (
                              <option key={producto.id} value={producto.id}>{producto.nombre} - stock {producto.stock_actual}</option>
                            ))}
                          </select>
                        </div>
                        <div className="m-field">
                          <label className="m-field__label">Descripcion</label>
                          <input className="m-field__input" value={item.descripcion} onChange={(event) => updateItem(index, 'descripcion', event.target.value)} />
                        </div>
                        <div className="m-field">
                          <label className="m-field__label">Cant.</label>
                          <input className="m-field__input" type="number" value={item.cantidad} onChange={(event) => updateItem(index, 'cantidad', event.target.value)} />
                        </div>
                        <div className="m-field">
                          <label className="m-field__label">Precio</label>
                          <input className="m-field__input" type="number" value={item.precio_unitario} onChange={(event) => updateItem(index, 'precio_unitario', event.target.value)} />
                        </div>
                        <div className="venta-item__meta">
                          <div className="venta-item__summary">
                            <span>Subtotal</span>
                            <strong>{fmt(subtotalItem)}</strong>
                          </div>
                          <button className="btn-icon btn-icon--danger venta-item__remove" type="button" onClick={() => removeItem(index)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-row modal-row-3">
                <div className="m-field">
                  <label className="m-field__label">Metodo de pago</label>
                  <select className="m-field__select" value={form.metodo_pago} onChange={updateForm('metodo_pago')}>
                    {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </div>
                <div className="m-field">
                  <label className="m-field__label">Efectivo recibido</label>
                  <input
                    className="m-field__input"
                    type="number"
                    value={form.monto_recibido}
                    disabled={form.metodo_pago !== 'EFECTIVO'}
                    onChange={updateForm('monto_recibido')}
                  />
                </div>
                <div className="m-field">
                  <label className="m-field__label">Descuento %</label>
                  <input className="m-field__input" type="number" value={form.descuento_porcentaje} onChange={updateForm('descuento_porcentaje')} />
                </div>
              </div>

              <input type="hidden" value={form.porcentaje_impuesto} readOnly />

              <div className="venta-summary">
                <div className="venta-summary__card"><span>Subtotal</span><strong>{fmt(computed.subtotal)}</strong></div>
                <div className="venta-summary__card"><span>Descuento</span><strong>{fmt(computed.descuentoValor)}</strong></div>
                <div className="venta-summary__card"><span>Total</span><strong>{fmt(computed.total)}</strong></div>
                <div className="venta-summary__card"><span>Pagado</span><strong>{fmt(computed.totalPagado)}</strong></div>
                <div className="venta-summary__card"><span>Cambio</span><strong>{fmt(computed.cambio)}</strong></div>
                <div className="venta-summary__card venta-summary__card--accent"><span>Estado</span><strong>{computed.estado}</strong></div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editingVenta ? 'Actualizar venta' : 'Crear venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
