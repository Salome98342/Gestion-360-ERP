import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, ChartColumnBig, CircleAlert, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ventasService } from '../../services/ventasService';
import { inventarioService } from '../../services/inventarioService';
import { usuariosService } from '../../services/usuariosService';
import { reportesService } from '../../services/reportesService';
import type { Venta, Compra } from '../../types/ventas';
import type { Producto } from '../../types/inventario';
import type { LogActividad } from '../../types/usuarios';
import type { EventoEmpresa } from '../../types/reportes';
import './ReportesPage.css';

type EventoForm = {
  titulo: string;
  descripcion: string;
  fecha: string;
  tipo: string;
};

function fmtMoney(n: number) {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

function toDatetimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function fmtDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ReportesPage() {
  const { user } = useAuth();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [logs, setLogs] = useState<LogActividad[]>([]);
  const [eventos, setEventos] = useState<EventoEmpresa[]>([]);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [openEventoModal, setOpenEventoModal] = useState(false);
  const [eventoError, setEventoError] = useState<string | null>(null);
  const [savingEvento, setSavingEvento] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eventoForm, setEventoForm] = useState<EventoForm>({
    titulo: '',
    descripcion: '',
    fecha: toDatetimeLocal(new Date()),
    tipo: 'GENERAL',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, c, p, l, e] = await Promise.all([
        ventasService.listVentas(),
        ventasService.listCompras(),
        inventarioService.listProductos(),
        usuariosService.listLogs(),
        reportesService.listEventos(),
      ]);
      setVentas(v);
      setCompras(c);
      setProductos(p);
      setLogs(l);
      setEventos(e);
    } catch {
      setError('No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ventasTotales = useMemo(() => ventas.reduce((acc, venta) => acc + venta.total, 0), [ventas]);
  const comprasTotales = useMemo(() => compras.reduce((acc, compra) => acc + compra.total, 0), [compras]);
  const utilidadEstimada = useMemo(() => ventas.reduce((acc, venta) => acc + venta.utilidad_total, 0), [ventas]);
  const pendientesCobro = useMemo(() => ventas.reduce((acc, venta) => acc + venta.saldo_pendiente, 0), [ventas]);

  const ventasPorEstado = useMemo(() => {
    const map = new Map<string, number>();
    ventas.forEach((venta) => {
      map.set(venta.estado, (map.get(venta.estado) ?? 0) + venta.total);
    });
    return [...map.entries()].map(([estado, total]) => ({ estado, total }));
  }, [ventas]);

  const topProductos = useMemo(() => {
    const counters = new Map<string, number>();
    ventas.forEach((venta) => {
      (venta.items ?? []).forEach((item) => {
        const key = item.descripcion || `Producto #${item.producto ?? 0}`;
        counters.set(key, (counters.get(key) ?? 0) + item.cantidad);
      });
    });
    return [...counters.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);
  }, [ventas]);

  const notificaciones = useMemo(() => {
    const lowStock = productos.filter((p) => p.stock_actual <= 5 && p.activo === 1).slice(0, 3).map((p) => ({
      tipo: 'Stock bajo',
      texto: `${p.nombre} tiene stock ${p.stock_actual}`,
      fecha: new Date().toISOString(),
      nivel: 'alerta',
    }));

    const pendientes = ventas
      .filter((v) => v.saldo_pendiente > 0)
      .slice(0, 3)
      .map((v) => ({
        tipo: 'Cuenta por cobrar',
        texto: `Venta #${v.id} pendiente por ${fmtMoney(v.saldo_pendiente)}`,
        fecha: v.fecha,
        nivel: 'aviso',
      }));

    const proximosEventos = eventos
      .filter((e) => {
        const diff = new Date(e.fecha).getTime() - Date.now();
        return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      })
      .slice(0, 3)
      .map((e) => ({
        tipo: 'Evento cercano',
        texto: `${e.titulo} - ${fmtDateTime(e.fecha)}`,
        fecha: e.fecha,
        nivel: 'info',
      }));

    const actividad = logs.slice(0, 4).map((log) => ({
      tipo: 'Actividad',
      texto: `${log.usuario_nombre}: ${log.accion}`,
      fecha: log.fecha,
      nivel: 'info',
    }));

    return [...lowStock, ...pendientes, ...proximosEventos, ...actividad]
      .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))
      .slice(0, 8);
  }, [eventos, logs, productos, ventas]);

  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventoEmpresa[]>();
    eventos.forEach((evento) => {
      const key = fmtDayKey(new Date(evento.fecha));
      const current = map.get(key) ?? [];
      current.push(evento);
      map.set(key, current);
    });
    return map;
  }, [eventos]);

  const calendarCells = useMemo(() => {
    const cells: Array<{ day: number | null; key: string }> = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push({ day: null, key: `b-${i}` });
    for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, key: `d-${day}` });
    while (cells.length % 7 !== 0) cells.push({ day: null, key: `a-${cells.length}` });
    return cells;
  }, [daysInMonth, firstWeekday]);

  const eventosMes = useMemo(() => {
    const ini = startOfMonth(calendarDate).getTime();
    const fin = endOfMonth(calendarDate).getTime();
    return eventos
      .filter((evento) => {
        const ts = new Date(evento.fecha).getTime();
        return ts >= ini && ts <= fin;
      })
      .sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha));
  }, [calendarDate, eventos]);

  const maxVentasEstado = Math.max(1, ...ventasPorEstado.map((item) => item.total));
  const maxTopProducto = Math.max(1, ...topProductos.map((item) => item.cantidad));

  const handleEventoField = (field: keyof EventoForm, value: string) => {
    setEventoForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateEvento = async () => {
    setEventoError(null);
    if (!user) {
      setEventoError('No hay sesión activa.');
      return;
    }
    if (!eventoForm.titulo.trim()) {
      setEventoError('El título es obligatorio.');
      return;
    }

    setSavingEvento(true);
    try {
      const created = await reportesService.createEvento({
        empresa: user.empresa_id,
        titulo: eventoForm.titulo.trim(),
        descripcion: eventoForm.descripcion.trim() || null,
        fecha: new Date(eventoForm.fecha).toISOString(),
        tipo: eventoForm.tipo,
        completado: 0,
      });
      setEventos((prev) => [...prev, created].sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha)));
      setOpenEventoModal(false);
      setEventoForm({
        titulo: '',
        descripcion: '',
        fecha: toDatetimeLocal(new Date()),
        tipo: 'GENERAL',
      });
    } catch {
      setEventoError('No se pudo guardar el evento.');
    } finally {
      setSavingEvento(false);
    }
  };

  if (loading) {
    return <div className="table-empty">Cargando panel de reportes…</div>;
  }

  if (error) {
    return <div className="table-empty" style={{ color: '#f87171' }}>{error}</div>;
  }

  return (
    <div className="upage">
      <div className="upage__header">
        <div>
          <h2 className="upage__title">Reportes y Análisis</h2>
          <p className="upage__subtitle">Resumen financiero, comportamiento comercial y agenda empresarial</p>
        </div>
      </div>

      <div className="report-grid report-grid--kpi">
        <article className="report-kpi">
          <span className="report-kpi__label">Ventas acumuladas</span>
          <strong className="report-kpi__value">{fmtMoney(ventasTotales)}</strong>
        </article>
        <article className="report-kpi">
          <span className="report-kpi__label">Compras acumuladas</span>
          <strong className="report-kpi__value">{fmtMoney(comprasTotales)}</strong>
        </article>
        <article className="report-kpi">
          <span className="report-kpi__label">Utilidad estimada</span>
          <strong className="report-kpi__value">{fmtMoney(utilidadEstimada)}</strong>
        </article>
        <article className="report-kpi">
          <span className="report-kpi__label">Cartera por cobrar</span>
          <strong className="report-kpi__value">{fmtMoney(pendientesCobro)}</strong>
        </article>
      </div>

      <div className="report-grid report-grid--main">
        <section className="report-card">
          <div className="report-card__head">
            <h3><ChartColumnBig size={15} /> Ventas por estado</h3>
          </div>
          <div className="report-bars">
            {ventasPorEstado.length === 0 && <p className="report-empty">No hay ventas para analizar.</p>}
            {ventasPorEstado.map((item) => (
              <div key={item.estado} className="report-bar-row">
                <span>{item.estado}</span>
                <div className="report-bar-track">
                  <div className="report-bar-fill" style={{ width: `${(item.total / maxVentasEstado) * 100}%` }} />
                </div>
                <strong>{fmtMoney(item.total)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="report-card">
          <div className="report-card__head">
            <h3><CircleAlert size={15} /> Productos más vendidos</h3>
          </div>
          <div className="report-bars">
            {topProductos.length === 0 && <p className="report-empty">Aún no hay items de venta registrados.</p>}
            {topProductos.map((item) => (
              <div key={item.nombre} className="report-bar-row">
                <span>{item.nombre}</span>
                <div className="report-bar-track">
                  <div className="report-bar-fill report-bar-fill--alt" style={{ width: `${(item.cantidad / maxTopProducto) * 100}%` }} />
                </div>
                <strong>{item.cantidad.toFixed(0)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="report-grid report-grid--main">
        <section className="report-card">
          <div className="report-card__head">
            <h3><CalendarDays size={15} /> Mini calendario empresarial</h3>
            <div className="report-card__actions">
              <button className="btn-icon" type="button" onClick={() => setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>◀</button>
              <span className="report-card__month">
                {calendarDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
              </span>
              <button className="btn-icon" type="button" onClick={() => setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>▶</button>
              <button className="btn-primary" type="button" onClick={() => setOpenEventoModal(true)}>
                <Plus size={14} /> Evento
              </button>
            </div>
          </div>

          <div className="mini-calendar__header">
            <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span><span>Dom</span>
          </div>
          <div className="mini-calendar__grid">
            {calendarCells.map((cell) => {
              if (!cell.day) return <div key={cell.key} className="mini-calendar__cell mini-calendar__cell--empty" />;
              const dayDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), cell.day);
              const dayKey = fmtDayKey(dayDate);
              const dayEvents = eventsByDay.get(dayKey) ?? [];
              return (
                <div key={cell.key} className="mini-calendar__cell">
                  <span className="mini-calendar__day">{cell.day}</span>
                  {dayEvents.slice(0, 2).map((evento) => (
                    <span key={evento.id} className="mini-calendar__event" title={`${evento.titulo} · ${fmtDateTime(evento.fecha)}`}>
                      {evento.titulo}
                    </span>
                  ))}
                  {dayEvents.length > 2 && <span className="mini-calendar__more">+{dayEvents.length - 2}</span>}
                </div>
              );
            })}
          </div>

          <div className="report-list">
            {eventosMes.length === 0 && <p className="report-empty">No hay eventos este mes.</p>}
            {eventosMes.slice(0, 6).map((evento) => (
              <article key={evento.id} className="report-list__item">
                <strong>{evento.titulo}</strong>
                <span>{fmtDateTime(evento.fecha)} · {evento.tipo}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="report-card">
          <div className="report-card__head">
            <h3><Bell size={15} /> Notificaciones</h3>
          </div>
          <div className="report-list">
            {notificaciones.length === 0 && <p className="report-empty">No hay notificaciones por ahora.</p>}
            {notificaciones.map((notif, idx) => (
              <article key={`${notif.tipo}-${idx}`} className="report-list__item">
                <strong>{notif.tipo}</strong>
                <span>{notif.texto}</span>
                <time>{fmtDateTime(notif.fecha)}</time>
              </article>
            ))}
          </div>
        </section>
      </div>

      {openEventoModal && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setOpenEventoModal(false); }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Nuevo evento empresarial</h3>
            </div>
            <div className="modal-body">
              {eventoError && <div className="modal-error">{eventoError}</div>}
              <div className="m-field">
                <label className="m-field__label">Titulo</label>
                <input className="m-field__input" value={eventoForm.titulo} onChange={(event) => handleEventoField('titulo', event.target.value)} />
              </div>
              <div className="m-field">
                <label className="m-field__label">Descripcion</label>
                <input className="m-field__input" value={eventoForm.descripcion} onChange={(event) => handleEventoField('descripcion', event.target.value)} />
              </div>
              <div className="modal-row">
                <div className="m-field">
                  <label className="m-field__label">Fecha y hora</label>
                  <input className="m-field__input" type="datetime-local" value={eventoForm.fecha} onChange={(event) => handleEventoField('fecha', event.target.value)} />
                </div>
                <div className="m-field">
                  <label className="m-field__label">Tipo</label>
                  <select className="m-field__select" value={eventoForm.tipo} onChange={(event) => handleEventoField('tipo', event.target.value)}>
                    <option value="GENERAL">General</option>
                    <option value="REUNION">Reunion</option>
                    <option value="PAGO">Pago</option>
                    <option value="VENCIMIENTO">Vencimiento</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" type="button" onClick={() => setOpenEventoModal(false)}>Cancelar</button>
                <button className="btn-save" type="button" disabled={savingEvento} onClick={handleCreateEvento}>
                  {savingEvento ? 'Guardando...' : 'Guardar evento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
