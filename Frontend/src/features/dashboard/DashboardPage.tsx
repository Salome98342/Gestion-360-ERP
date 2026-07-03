import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Banknote,
  CreditCard,
  Package,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import type { Venta, Compra } from '../../types/ventas';
import type { Producto } from '../../types/inventario';
import type { LogActividad } from '../../types/usuarios';
import type { EventoEmpresa } from '../../types/reportes';
import './DashboardPage.css';

const QUICK_MODULES = [
  { label: 'Nueva venta', desc: 'Registrar venta rapida', to: '/ventas', color: 'blue' },
  { label: 'Inventario', desc: 'Productos, stock y precios', to: '/inventario', color: 'cyan' },
  { label: 'Caja', desc: 'Apertura, cierre y movimientos', to: '/caja', color: 'green' },
  { label: 'Compras', desc: 'Entradas de mercancia', to: '/compras', color: 'violet' },
] as const;

function fmtMoney(n: number) {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function sameDay(iso: string, date = new Date()) {
  const d = new Date(iso);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [logs, setLogs] = useState<LogActividad[]>([]);
  const [eventos, setEventos] = useState<EventoEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    dashboardService.loadDashboard()
      .then((data) => {
        if (!mounted) return;
        setVentas(data.ventas);
        setCompras(data.compras);
        setProductos(data.productos);
        setLogs(data.logs);
        setEventos(data.eventos);
      })
      .catch(() => {
        if (!mounted) return;
        setError('No se pudieron cargar los indicadores del dashboard.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const ventasHoy = useMemo(() => ventas.filter((venta) => sameDay(venta.fecha) && venta.estado !== 'ANULADO'), [ventas]);
  const totalVentasHoy = useMemo(() => ventasHoy.reduce((acc, venta) => acc + venta.total, 0), [ventasHoy]);
  const recibidoHoy = useMemo(() => ventasHoy.reduce((acc, venta) => acc + venta.total_pagado, 0), [ventasHoy]);
  const cartera = useMemo(() => ventas.reduce((acc, venta) => acc + (venta.estado !== 'ANULADO' ? venta.saldo_pendiente : 0), 0), [ventas]);
  const stockBajo = useMemo(() => productos.filter((producto) => producto.activo === 1 && producto.stock_actual <= 5), [productos]);

  const pagosHoy = useMemo(() => {
    const map = new Map<string, number>();
    ventasHoy.forEach((venta) => {
      const key = venta.metodo_pago || 'SIN METODO';
      map.set(key, (map.get(key) ?? 0) + venta.total_pagado);
    });
    return [...map.entries()].map(([metodo, total]) => ({ metodo, total })).sort((a, b) => b.total - a.total);
  }, [ventasHoy]);

  const comprasMes = useMemo(() => {
    const now = new Date();
    return compras
      .filter((compra) => {
        const d = new Date(compra.fecha);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, compra) => acc + compra.total, 0);
  }, [compras]);

  const proximosEventos = useMemo(() => eventos
    .filter((evento) => new Date(evento.fecha).getTime() >= Date.now())
    .sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha))
    .slice(0, 3), [eventos]);

  const kpis = [
    {
      label: 'Ventas de hoy',
      value: fmtMoney(totalVentasHoy),
      delta: `${ventasHoy.length} ventas`,
      icon: ShoppingCart,
      color: 'blue',
    },
    {
      label: 'Recibido hoy',
      value: fmtMoney(recibidoHoy),
      delta: recibidoHoy >= totalVentasHoy ? 'Ventas cubiertas' : 'Con saldos',
      icon: Banknote,
      color: 'green',
    },
    {
      label: 'Por cobrar',
      value: fmtMoney(cartera),
      delta: cartera > 0 ? 'Revisar creditos' : 'Al dia',
      icon: Wallet,
      color: 'cyan',
    },
    {
      label: 'Stock bajo',
      value: String(stockBajo.length),
      delta: `${productos.length} productos`,
      icon: Package,
      color: 'violet',
    },
  ] as const;

  const maxPago = Math.max(1, ...pagosHoy.map((item) => item.total));

  return (
    <div className="dash">
      <div className="dash__welcome">
        <div>
          <h1 className="dash__title">Hola, <span className="dash__title--accent">{user?.nombre}</span></h1>
          <p className="dash__date">Resumen operativo de hoy</p>
        </div>
        <div className="dash__status">
          <Activity size={13} aria-hidden="true" />
          <span>Sistema activo</span>
        </div>
      </div>

      <section aria-label="Indicadores principales">
        <div className="dash__kpi-grid">
          {kpis.map(({ label, value, delta, icon: Icon, color }) => (
            <div className={`dash-kpi dash-kpi--${color}`} key={label}>
              <div className="dash-kpi__icon"><Icon size={19} aria-hidden="true" /></div>
              <div className="dash-kpi__body">
                <span className="dash-kpi__label">{label}</span>
                <span className="dash-kpi__value">{value}</span>
              </div>
              <div className="dash-kpi__delta dash-kpi__delta--up"><span>{delta}</span></div>
            </div>
          ))}
        </div>
      </section>

      {(loading || error) && (
        <section>
          {loading && <p className="dash__hint">Cargando indicadores...</p>}
          {error && <p className="dash__hint dash__hint--error">{error}</p>}
        </section>
      )}

      <section className="dash__analytics" aria-label="Analisis rapido">
        <div className="dash-panel">
          <p className="dash__section-label">Caja del dia</p>
          <h3 className="dash-panel__title"><CreditCard size={15} /> Pagos por metodo</h3>
          <div className="dash-bars">
            {pagosHoy.length === 0 && <p className="dash__hint">Sin pagos registrados hoy.</p>}
            {pagosHoy.map((item) => (
              <div key={item.metodo} className="dash-bar-row">
                <span>{item.metodo}</span>
                <div className="dash-bar-track">
                  <div className="dash-bar-fill" style={{ width: `${(item.total / maxPago) * 100}%` }} />
                </div>
                <strong>{fmtMoney(item.total)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-panel">
          <p className="dash__section-label">Alertas</p>
          <h3 className="dash-panel__title">Atencion requerida</h3>
          <div className="dash-notifs">
            {stockBajo.slice(0, 4).map((producto) => (
              <article className="dash-notif" key={`stock-${producto.id}`}>
                <strong>Stock bajo</strong>
                <span>{producto.nombre}: {producto.stock_actual} unidades</span>
              </article>
            ))}
            {proximosEventos.map((evento) => (
              <article className="dash-notif" key={`evento-${evento.id}`}>
                <strong>{evento.titulo}</strong>
                <span>{new Date(evento.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </article>
            ))}
            {stockBajo.length === 0 && proximosEventos.length === 0 && <p className="dash__hint">No hay alertas por ahora.</p>}
          </div>
        </div>
      </section>

      <section className="dash__analytics" aria-label="Actividad reciente">
        <div className="dash-panel">
          <p className="dash__section-label">Ventas recientes</p>
          <h3 className="dash-panel__title">Ultimos movimientos</h3>
          <div className="dash-notifs">
            {ventas.slice(0, 5).map((venta) => (
              <article className="dash-notif" key={`venta-${venta.id}`}>
                <strong>{venta.cliente_nombre || 'Consumidor final'} - {fmtMoney(venta.total)}</strong>
                <span>{venta.metodo_pago} · {venta.estado}</span>
              </article>
            ))}
            {ventas.length === 0 && <p className="dash__hint">Aun no hay ventas registradas.</p>}
          </div>
        </div>

        <div className="dash-panel">
          <p className="dash__section-label">Compras</p>
          <h3 className="dash-panel__title">Compras del mes: {fmtMoney(comprasMes)}</h3>
          <div className="dash-notifs">
            {logs.slice(0, 5).map((log) => (
              <article className="dash-notif" key={`log-${log.id}`}>
                <strong>{log.accion}</strong>
                <span>{log.usuario_nombre} · {log.modulo || 'general'}</span>
              </article>
            ))}
            {logs.length === 0 && <p className="dash__hint">Sin actividad reciente.</p>}
          </div>
        </div>
      </section>

      <section aria-label="Acceso rapido a modulos">
        <p className="dash__section-label">Acceso rapido</p>
        <div className="dash__module-grid">
          {QUICK_MODULES.map(({ label, desc, to, color }) => (
            <Link key={to} to={to} className={`dash-module dash-module--${color}`}>
              <span className="dash-module__name">{label}</span>
              <span className="dash-module__desc">{desc}</span>
              <ArrowUpRight size={15} className="dash-module__arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
