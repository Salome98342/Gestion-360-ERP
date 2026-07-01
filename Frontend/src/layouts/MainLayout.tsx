import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
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
import logo360 from '../assets/Logo.png';
import './MainLayout.css';

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/ventas',     icon: ShoppingCart, label: 'Ventas'     },
      { to: '/inventario', icon: Package,      label: 'Inventario' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/usuarios', icon: Users,     label: 'Usuarios' },
      { to: '/empresas', icon: Building2, label: 'Empresas' },
    ],
  },
  {
    label: 'Reportes',
    items: [{ to: '/reportes', icon: BarChart3, label: 'Análisis' }],
  },
] as const;

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.nombre?.charAt(0).toUpperCase() ?? 'U';

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
          {NAV_GROUPS.map((group) => (
            <div className="erp-nav-group" key={group.label}>
              <span className="erp-nav-group__label">{group.label}</span>
              {group.items.map(({ to, icon: Icon, label }) => (
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
