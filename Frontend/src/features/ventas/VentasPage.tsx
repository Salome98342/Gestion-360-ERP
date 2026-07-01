import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { canCreate } from '../../utils/permissions';
import { ventasService } from '../../services/ventasService';
import { inventarioService } from '../../services/inventarioService';
import { usuariosService } from '../../services/usuariosService';
import type { Cliente, Producto } from '../../types/inventario';
import type { Sucursal } from '../../types/usuarios';
import type { Venta, VentaCreateItem, VentaCreatePayload, VentaEstado } from '../../types/ventas';
import { VENTA_ESTADOS } from '../../types/ventas';
import './VentasPage.css';

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
  tipo_pago: string;
};

type VentaForm = {
  cliente: string;
  sucursal: string;
  estado: VentaEstado;
  descuento_porcentaje: string;
  porcentaje_impuesto: string;
  total_pagado: string;
  fecha_vencimiento: string;
};

const ESTADO_CLASS: Record<string, string> = {
  PAGADO: 'active',
  PENDIENTE: 'warn',
  ANULADO: 'inactive',
  CREDITO: 'role',
};

const EMPTY_ITEM: VentaItemForm = {
  producto: '',
  descripcion: '',
  cantidad: '1',
  precio_unitario: '0',
  costo_unitario: '0',
  tipo_pago: 'EFECTIVO',
};

const EMPTY_FORM: VentaForm = {
  cliente: '',
  sucursal: '',
  estado: 'PENDIENTE',
  descuento_porcentaje: '0',
  porcentaje_impuesto: '0',
  total_pagado: '0',
  fecha_vencimiento: '',
};

export default function VentasPage() {
  const { user: me } = useAuth();
  const canAddVenta = canCreate(me, 'ventas');

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtEstado, setFiltEstado] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mError, setMError] = useState<string | null>(null);
  const [form, setForm] = useState<VentaForm>(EMPTY_FORM);
  const [items, setItems] = useState<VentaItemForm[]>([EMPTY_ITEM]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ventasData, clientesData, productosData, sucursalesData] = await Promise.all([
        ventasService.listVentas(filtEstado || undefined),
        inventarioService.listClientes(),
        inventarioService.listProductos({ activo: 1 }),
        usuariosService.listSucursales(),
      ]);
      setVentas(ventasData);
      setClientes(clientesData);
      setProductos(productosData);
      setSucursales(sucursalesData);
    } catch {
      setError('No se pudieron cargar las ventas.');
    } finally {
      setLoading(false);
    }
  }, [filtEstado]);

  useEffect(() => {
    load();
  }, [load]);

  const productById = useMemo(() => {
    const map = new Map<number, Producto>();
    productos.forEach((producto) => map.set(producto.id, producto));
    return map;
  }, [productos]);

  const computed = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + toNumber(item.cantidad) * toNumber(item.precio_unitario), 0);
    const descuentoPorcentaje = toNumber(form.descuento_porcentaje);
    const descuentoValor = subtotal * descuentoPorcentaje / 100;
    const subtotalConDescuento = subtotal - descuentoValor;
    const porcentajeImpuesto = toNumber(form.porcentaje_impuesto);
    const valorImpuesto = subtotalConDescuento * porcentajeImpuesto / 100;
    const total = subtotalConDescuento + valorImpuesto;
    const totalPagado = toNumber(form.total_pagado);
    const saldoPendiente = total - totalPagado;
    const utilidadTotal = items.reduce(
      (acc, item) => acc + toNumber(item.cantidad) * (toNumber(item.precio_unitario) - toNumber(item.costo_unitario)),
      0,
    );

    return {
      subtotal,
      descuentoValor,
      subtotalConDescuento,
      valorImpuesto,
      total,
      totalPagado,
      saldoPendiente,
      utilidadTotal,
    };
  }, [items, form.descuento_porcentaje, form.porcentaje_impuesto, form.total_pagado]);

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      sucursal: me?.sucursal_id ? String(me.sucursal_id) : '',
    });
    setItems([{ ...EMPTY_ITEM }]);
    setMError(null);
    setOpen(true);
  };

  const updateForm = (key: keyof VentaForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const updateItem = (index: number, key: keyof VentaItemForm, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      const current = { ...next[index], [key]: value };

      if (key === 'producto') {
        const selected = value ? productById.get(Number(value)) : undefined;
        if (selected) {
          current.precio_unitario = String(selected.precio_venta);
          current.costo_unitario = String(selected.costo_promedio);
          if (!current.descripcion.trim()) {
            current.descripcion = selected.nombre;
          }
        }
      }

      next[index] = current;
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index: number) => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const handleSave = async () => {
    setMError(null);

    if (!form.cliente || !form.sucursal) {
      setMError('Debes seleccionar cliente y sucursal.');
      return;
    }

    if (!items.length || items.some((item) => !toNumber(item.cantidad) || toNumber(item.precio_unitario) < 0)) {
      setMError('Cada item debe tener cantidad mayor que cero y un precio válido.');
      return;
    }

    if (items.some((item) => !item.producto && !item.descripcion.trim())) {
      setMError('Cada item debe tener un producto o una descripción.');
      return;
    }

    if (!me) {
      setMError('La sesión no está disponible.');
      return;
    }

    setSaving(true);
    try {
      const payload: VentaCreatePayload = {
        empresa: me.empresa_id,
        cliente: Number(form.cliente),
        sucursal: Number(form.sucursal),
        usuario: me.id,
        fecha: new Date().toISOString(),
        descuento_porcentaje: toNumber(form.descuento_porcentaje),
        porcentaje_impuesto: toNumber(form.porcentaje_impuesto),
        total_pagado: toNumber(form.total_pagado),
        estado: form.estado,
        fecha_vencimiento: form.fecha_vencimiento ? new Date(form.fecha_vencimiento).toISOString() : null,
        items: items.map<VentaCreateItem>((item) => ({
          producto: item.producto ? Number(item.producto) : null,
          descripcion: item.descripcion.trim(),
          cantidad: toNumber(item.cantidad),
          precio_unitario: toNumber(item.precio_unitario),
          costo_unitario: toNumber(item.costo_unitario),
          tipo_pago: item.tipo_pago || 'EFECTIVO',
        })),
      };

      const created = await ventasService.createVenta(payload);
      setVentas((prev) => [created, ...prev]);
      setOpen(false);
    } catch (e) {
      setMError(e instanceof Error ? e.message : 'No se pudo registrar la venta.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = ventas.filter((venta) =>
    venta.cliente_nombre.toLowerCase().includes(search.toLowerCase()) ||
    venta.usuario_nombre.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="upage">
      <div className="upage__header">
        <div>
          <h2 className="upage__title">Ventas</h2>
          <p className="upage__subtitle">Historial de transacciones y creación de nuevas ventas</p>
        </div>
      </div>

      <div className="tab-toolbar">
        <div className="tab-toolbar__left">
          <div className="tab-search">
            <Search size={13} className="tab-search__icon" />
            <input
              className="tab-search__input"
              placeholder="Buscar cliente o vendedor…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="tab-select" value={filtEstado} onChange={(event) => setFiltEstado(event.target.value)}>
            <option value="">Todos los estados</option>
            {VENTA_ESTADOS.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
        </div>

        {canAddVenta && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={14} /> Nueva Venta
          </button>
        )}
      </div>

      {error && <div className="table-empty" style={{ color: '#f87171' }}>{error}</div>}
      {loading && <div className="table-empty">Cargando ventas…</div>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Sucursal</th>
                <th>Subtotal</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Saldo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-empty">No se encontraron ventas.</td>
                </tr>
              ) : (
                filtered.map((venta) => (
                  <tr key={venta.id}>
                    <td className="td-mono" style={{ whiteSpace: 'nowrap' }}>{fmtDate(venta.fecha)}</td>
                    <td className="td-name">{venta.cliente_nombre}</td>
                    <td>{venta.usuario_nombre}</td>
                    <td>{venta.sucursal_nombre}</td>
                    <td className="td-num">{fmt(venta.subtotal)}</td>
                    <td className="td-num" style={{ fontWeight: 700, color: '#e2e8f0' }}>{fmt(venta.total)}</td>
                    <td className="td-num" style={{ color: '#4ade80' }}>{fmt(venta.total_pagado)}</td>
                    <td className="td-num" style={{ color: venta.saldo_pendiente > 0 ? '#f87171' : '#94a3b8' }}>{fmt(venta.saldo_pendiente)}</td>
                    <td>
                      <span className={`badge badge--${ESTADO_CLASS[venta.estado] || 'inactive'}`}>{venta.estado}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="modal-card modal-card--wide venta-modal">
            <div className="modal-header">
              <h3 className="modal-title">Nueva Venta</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div className="modal-body venta-form">
              {mError && <div className="modal-error">{mError}</div>}

              <div className="modal-row">
                <div className="m-field">
                  <label className="m-field__label">Cliente *</label>
                  <select className="m-field__select" value={form.cliente} onChange={updateForm('cliente')}>
                    <option value="">Seleccionar…</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="m-field">
                  <label className="m-field__label">Sucursal *</label>
                  <select className="m-field__select" value={form.sucursal} onChange={updateForm('sucursal')}>
                    <option value="">Seleccionar…</option>
                    {sucursales.map((sucursal) => (
                      <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-row modal-row-3">
                <div className="m-field">
                  <label className="m-field__label">Estado</label>
                  <select className="m-field__select" value={form.estado} onChange={updateForm('estado')}>
                    {VENTA_ESTADOS.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                  </select>
                </div>
                <div className="m-field">
                  <label className="m-field__label">Descuento %</label>
                  <input className="m-field__input" type="number" value={form.descuento_porcentaje} onChange={updateForm('descuento_porcentaje')} />
                </div>
                <div className="m-field">
                  <label className="m-field__label">Impuesto %</label>
                  <input className="m-field__input" type="number" value={form.porcentaje_impuesto} onChange={updateForm('porcentaje_impuesto')} />
                </div>
              </div>

              <div className="modal-row modal-row-3">
                <div className="m-field">
                  <label className="m-field__label">Total pagado</label>
                  <input className="m-field__input" type="number" value={form.total_pagado} onChange={updateForm('total_pagado')} />
                </div>
                <div className="m-field">
                  <label className="m-field__label">Fecha vencimiento</label>
                  <input className="m-field__input" type="datetime-local" value={form.fecha_vencimiento} onChange={updateForm('fecha_vencimiento')} />
                </div>
                <div className="m-field">
                  <label className="m-field__label">Vendedor</label>
                  <input className="m-field__input" value={me?.nombre ?? ''} readOnly />
                </div>
              </div>

              <div className="venta-section">
                <div className="venta-section__header">
                  <div>
                    <h4 className="venta-section__title">Items de la venta</h4>
                    <p className="venta-section__subtitle">Puedes registrar uno o varios productos en la misma venta.</p>
                  </div>
                  <button className="btn-primary" type="button" onClick={addItem}>
                    <Plus size={14} /> Agregar item
                  </button>
                </div>

                <div className="venta-items">
                  {items.map((item, index) => {
                    const subtotalItem = toNumber(item.cantidad) * toNumber(item.precio_unitario);
                    return (
                      <div key={`${index}-${item.producto}`} className="venta-item">
                        <div className="m-field">
                          <label className="m-field__label">Producto</label>
                          <select
                            className="m-field__select"
                            value={item.producto}
                            onChange={(event) => updateItem(index, 'producto', event.target.value)}
                          >
                            <option value="">Sin producto</option>
                            {productos.map((producto) => (
                              <option key={producto.id} value={producto.id}>{producto.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="m-field">
                          <label className="m-field__label">Descripción</label>
                          <input
                            className="m-field__input"
                            value={item.descripcion}
                            onChange={(event) => updateItem(index, 'descripcion', event.target.value)}
                            placeholder="Detalle del item"
                          />
                        </div>
                        <div className="m-field">
                          <label className="m-field__label">Cantidad</label>
                          <input
                            className="m-field__input"
                            type="number"
                            value={item.cantidad}
                            onChange={(event) => updateItem(index, 'cantidad', event.target.value)}
                          />
                        </div>
                        <div className="m-field">
                          <label className="m-field__label">Precio unitario</label>
                          <input
                            className="m-field__input"
                            type="number"
                            value={item.precio_unitario}
                            onChange={(event) => updateItem(index, 'precio_unitario', event.target.value)}
                          />
                        </div>
                        <div className="m-field">
                          <label className="m-field__label">Costo</label>
                          <input
                            className="m-field__input"
                            type="number"
                            value={item.costo_unitario}
                            onChange={(event) => updateItem(index, 'costo_unitario', event.target.value)}
                          />
                        </div>
                        <div className="venta-item__meta">
                          <div className="m-field">
                            <label className="m-field__label">Tipo pago</label>
                            <input
                              className="m-field__input"
                              value={item.tipo_pago}
                              onChange={(event) => updateItem(index, 'tipo_pago', event.target.value)}
                            />
                          </div>
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

              <div className="venta-summary">
                <div className="venta-summary__card">
                  <span>Subtotal</span>
                  <strong>{fmt(computed.subtotal)}</strong>
                </div>
                <div className="venta-summary__card">
                  <span>Descuento</span>
                  <strong>{fmt(computed.descuentoValor)}</strong>
                </div>
                <div className="venta-summary__card">
                  <span>Impuesto</span>
                  <strong>{fmt(computed.valorImpuesto)}</strong>
                </div>
                <div className="venta-summary__card">
                  <span>Total</span>
                  <strong>{fmt(computed.total)}</strong>
                </div>
                <div className="venta-summary__card">
                  <span>Pagado</span>
                  <strong>{fmt(computed.totalPagado)}</strong>
                </div>
                <div className="venta-summary__card venta-summary__card--accent">
                  <span>Saldo pendiente</span>
                  <strong>{fmt(computed.saldoPendiente)}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Crear venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}