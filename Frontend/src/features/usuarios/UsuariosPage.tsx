import { useState } from 'react';
import TabUsuarios from './components/TabUsuarios';
import TabRoles    from './components/TabRoles';
import TabLogs     from './components/TabLogs';
import './UsuariosPage.css';

const TABS = [
  { id: 'usuarios', label: 'Usuarios'          },
  { id: 'roles',    label: 'Roles'             },
  { id: 'logs',     label: 'Logs de Actividad' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function UsuariosPage() {
  const [active, setActive] = useState<TabId>('usuarios');

  return (
    <div className="upage">
      <div className="upage__header">
        <div>
          <h2 className="upage__title">Gestión de Usuarios</h2>
          <p className="upage__subtitle">Administra perfiles, roles y permisos del sistema</p>
        </div>
      </div>

      <div className="upage__tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className={`upage__tab${active === id ? ' upage__tab--active' : ''}`}
            onClick={() => setActive(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="upage__content">
        {active === 'usuarios' && <TabUsuarios />}
        {active === 'roles'    && <TabRoles />}
        {active === 'logs'     && <TabLogs />}
      </div>
    </div>
  );
}
