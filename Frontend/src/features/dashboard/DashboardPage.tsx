import { Link } from 'react-router-dom';
import {
  TrendingUp, ShoppingCart, Package, Users,
  ArrowUpRight, ArrowDownRight, Activity,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './DashboardPage.css';

const KPI_CARDS = [
  { label: 'Ventas del Día',      value: '$0', delta: '—', up: true,  icon: TrendingUp,  color: 'blue'   },
  { label: 'Pedidos Pendientes',  value: '0',  delta: '—', up: true,  icon: ShoppingCart, color: 'cyan'  },
  { label: 'Productos en Stock',  value: '0',  delta: '—', up: true,  icon: Package,      color: 'green' },
  { label: 'Usuarios Activos',    value: '0',  delta: '—', up: true,  icon: Users,        color: 'violet'},
] as const;

const QUICK_MODULES = [
  { label: 'Ventas',      desc: 'Gestión de pedidos y facturación',  to: '/ventas',     color: 'blue'   },
  { label: 'Inventario',  desc: 'Control de productos y stock',       to: '/inventario', color: 'cyan'   },
  { label: 'Usuarios',    desc: 'Roles, permisos y accesos',          to: '/usuarios',   color: 'violet' },
  { label: 'Reportes',    desc: 'Análisis y métricas del negocio',    to: '/reportes',   color: 'green'  },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="dash">

      {/* Bienvenida */}
      <div className="dash__welcome">
        <div>
          <h1 className="dash__title">
            Bienvenido, <span className="dash__title--accent">{user?.nombre}</span>
          </h1>
          <p className="dash__date">{today}</p>
        </div>
        <div className="dash__status">
          <Activity size={13} aria-hidden="true" />
          <span>Sistema operativo</span>
        </div>
      </div>

      {/* KPI Cards */}
      <section aria-label="Indicadores principales">
        <div className="dash__kpi-grid">
          {KPI_CARDS.map(({ label, value, delta, up, icon: Icon, color }) => (
            <div className={`dash-kpi dash-kpi--${color}`} key={label}>
              <div className="dash-kpi__icon">
                <Icon size={19} aria-hidden="true" />
              </div>
              <div className="dash-kpi__body">
                <span className="dash-kpi__label">{label}</span>
                <span className="dash-kpi__value">{value}</span>
              </div>
              <div className={`dash-kpi__delta dash-kpi__delta--${up ? 'up' : 'down'}`}>
                {up
                  ? <ArrowUpRight   size={13} aria-hidden="true" />
                  : <ArrowDownRight size={13} aria-hidden="true" />
                }
                <span>{delta}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Acceso rápido */}
      <section aria-label="Acceso rápido a módulos">
        <p className="dash__section-label">Acceso rápido</p>
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
