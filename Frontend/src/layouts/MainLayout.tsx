import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Package,
  Users,
  Building2,
  BarChart3,
  Bell,
  Search,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { canView } from '../utils/permissions';
import type { ModuleKey } from '../types/usuarios';
import logo360 from '../assets/Logo.png';
import './MainLayout.css';

// ── Definición de navegación con módulo requerido ──────────────────────────
// modulo: null  → siempre visible (sin restricción de permiso)
// modulo: string → solo visible si can(user, modulo, 'ver') === true
const ALL_NAV_ITEMS: {
  group: string;
  to:    string;
  icon:  React.ElementType;
  label: string;
  modulo: ModuleKey | null;
}[] = [
  { group: 'Principal',      to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',   modulo: null           },
  { group: 'Operaciones',    to: '/ventas',     icon: ShoppingCart, label: 'Ventas',      modulo: 'ventas'     },
  { group: 'Operaciones',    to: '/compras',    icon: ShoppingBag,  label: 'Compras',     modulo: 'compras'    },
  { group: 'Operaciones',    to: '/inventario', icon: Package,      label: 'Inventario',  modulo: 'inventario' },
  { group: 'Administración', to: '/usuarios',  icon: Users,           label: 'Usuarios',     modulo: 'usuarios'     },
  { group: 'Administración', to: '/empresas',  icon: Building2,       label: 'Empresas',     modulo: 'empresas'     },
  { group: 'Reportes',       to: '/reportes',  icon: BarChart3,       label: 'Análisis',     modulo: 'reportes'     },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.nombre?.charAt(0).toUpperCase() ?? 'U';

  // Filtrar items por permiso y agrupar
  const visibleItems = ALL_NAV_ITEMS.filter(item =>
    item.modulo === null || canView(user, item.modulo)
  );
  const groups = [...new Set(visibleItems.map(i => i.group))];

  return (
    <div className="erp-app">

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="erp-sidebar">
        <div className="erp-sidebar__brand">
          <img src={logo360} alt="Gestión 360" className="erp-sidebar__logo" />
          <div>
            <span className="erp-sidebar__brand-name">Gestión 360</span>
            <span className="erp-sidebar__brand-sub">ERP Empresarial</span>
          </div>
        </div>

        <nav className="erp-sidebar__nav" aria-label="Navegación principal">
          {groups.map(group => (
            <div className="erp-nav-group" key={group}>
              <span className="erp-nav-group__label">{group}</span>
              {visibleItems.filter(i => i.group === group).map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `erp-nav-item${isActive ? ' erp-nav-item--active' : ''}`
                  }
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                  <ChevronRight size={13} className="erp-nav-item__arrow" aria-hidden="true" />
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="erp-sidebar__user">
          <div className="erp-sidebar__avatar" aria-hidden="true">{initials}</div>
          <div className="erp-sidebar__user-info">
            <span className="erp-sidebar__user-name">{user?.nombre ?? '—'}</span>
            <span className="erp-sidebar__user-role">{user?.rol?.nombre ?? '—'}</span>
          </div>
          <button
            className="erp-sidebar__logout"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────── */}
      <div className="erp-main">
        <header className="erp-header">
          <div className="erp-header__search">
            <Search size={14} className="erp-header__search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar en el sistema..."
              className="erp-header__search-input"
              aria-label="Buscar"
            />
          </div>
          <div className="erp-header__actions">
            <button className="erp-header__icon-btn" aria-label="Notificaciones">
              <Bell size={17} />
              <span className="erp-header__badge" aria-hidden="true" />
            </button>
            <div className="erp-header__divider" aria-hidden="true" />
            <div className="erp-header__user">
              <span className="erp-header__user-name">{user?.nombre}</span>
              <div className="erp-header__avatar" aria-hidden="true">{initials}</div>
            </div>
          </div>
        </header>

        <main className="erp-content">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
