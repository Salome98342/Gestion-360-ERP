import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Package,
  Users,
  Building2,
  BarChart3,
  Wallet,
  Bell,
  Search,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { canView, isAdminUser } from '../utils/permissions';
import type { ModuleKey } from '../types/usuarios';
import { empresasService } from '../services/empresasService';
import { reportesService } from '../services/reportesService';
import { usuariosService } from '../services/usuariosService';
import type { AdminRealtimeNotification } from '../services/usuariosService';
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
  { group: 'Operaciones',    to: '/caja',       icon: Wallet,       label: 'Caja',        modulo: 'caja'       },
  { group: 'Administración', to: '/usuarios',  icon: Users,           label: 'Usuarios',     modulo: 'usuarios'     },
  { group: 'Administración', to: '/empresas',  icon: Building2,       label: 'Empresas',     modulo: 'empresas'     },
  { group: 'Reportes',       to: '/reportes',  icon: BarChart3,       label: 'Análisis',     modulo: 'reportes'     },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ title: string; detail: string; date: string }>>([]);
  const companyNameRef = useRef('Gestión 360');
  const admin = useMemo(() => isAdminUser(user), [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.nombre?.charAt(0).toUpperCase() ?? 'U';

  useEffect(() => {
    if (!user || !admin) {
      queueMicrotask(() => {
        setNotifications([]);
      });
      return;
    }

    let mounted = true;
    Promise.all([
      usuariosService.listLogs({ limit: 100 }),
      reportesService.listEventos(),
      empresasService.getEmpresa(user.empresa_id),
    ])
      .then(([logs, eventos, empresa]) => {
        if (!mounted) return;
        companyNameRef.current = empresa?.nombre?.trim() || 'Gestión 360';
        const fromEvents = eventos
          .filter((evento) => {
            const delta = new Date(evento.fecha).getTime() - Date.now();
            return delta >= 0 && delta <= 7 * 24 * 60 * 60 * 1000;
          })
          .slice(0, 4)
          .map((evento) => ({
            title: 'Evento próximo',
            detail: evento.titulo,
            date: evento.fecha,
          }));

        const fromLogs = logs.slice(0, 6).map((log) => ({
          title: log.accion,
          detail: `${log.usuario_nombre} · ${log.modulo || 'general'}`,
          date: log.fecha,
        }));

        setNotifications([...fromEvents, ...fromLogs].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 7));
      })
      .catch(() => {
        if (!mounted) return;
        companyNameRef.current = 'Gestión 360';
        setNotifications([]);
      });

    const showBackgroundAlert = (
      title: string,
      detail: string,
      payload: AdminRealtimeNotification,
    ) => {
      if (!('Notification' in window)) return;
      if (document.visibilityState !== 'hidden') return;
      if (Notification.permission !== 'granted') return;

      const header = payload.kind === 'evento'
        ? `${companyNameRef.current} · Recordatorio`
        : `${companyNameRef.current} · Panel administrativo`;

      try {
        new Notification(header, {
          body: `${title}\n${detail}`,
          icon: logo360,
          badge: logo360,
          tag: `${payload.kind}-${payload.id}`,
        });
      } catch {
        // Silencioso para evitar errores de runtime en navegadores restringidos.
      }
    };

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const subscription = usuariosService.subscribeAdminNotifications(
      (payload: AdminRealtimeNotification) => {
        if (!mounted) return;

        const mapped = payload.kind === 'evento'
          ? {
              title: payload.titulo || 'Evento próximo',
              detail: payload.descripcion || 'Tienes un evento pendiente por revisar.',
              date: payload.fecha,
            }
          : {
              title: payload.accion || 'Actividad reciente',
              detail: `${payload.usuario_nombre || 'Usuario'} · ${payload.modulo || 'general'}`,
              date: payload.fecha,
            };

        setNotifications((prev) => {
          const dedupeKey = `${mapped.title}|${mapped.detail}|${mapped.date}`;
          const exists = prev.some((n) => `${n.title}|${n.detail}|${n.date}` === dedupeKey);
          if (exists) return prev;
          return [mapped, ...prev].slice(0, 20);
        });

        showBackgroundAlert(mapped.title, mapped.detail, payload);
      },
      () => {
        // Si el stream falla, mantenemos el panel con los datos ya cargados.
      },
    );

    return () => {
      mounted = false;
      subscription?.close();
    };
  }, [user, admin]);

  const notifBadge = useMemo(() => notifications.length, [notifications]);

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
            {admin && (
              <>
                <button
                  className="erp-header__icon-btn"
                  aria-label="Notificaciones"
                  onClick={() => setNotifOpen((prev) => !prev)}
                >
                  <Bell size={17} />
                  {notifBadge > 0 && <span className="erp-header__badge" aria-hidden="true" />}
                </button>
                {notifOpen && (
                  <div className="erp-notifs" role="dialog" aria-label="Panel de notificaciones">
                    <h4 className="erp-notifs__title">Notificaciones (admin)</h4>
                    {notifications.length === 0 && <p className="erp-notifs__empty">Sin notificaciones por ahora.</p>}
                    {notifications.map((notif, index) => (
                      <article className="erp-notifs__item" key={`${notif.title}-${index}`}>
                        <strong>{notif.title}</strong>
                        <span>{notif.detail}</span>
                        <time>{new Date(notif.date).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</time>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
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
