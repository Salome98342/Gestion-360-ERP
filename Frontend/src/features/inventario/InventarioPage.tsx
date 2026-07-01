import { useState } from 'react';
import TabProductos  from './components/TabProductos';
import TabCategorias from './components/TabCategorias';
import TabProveedores from './components/TabProveedores';
import TabClientes  from './components/TabClientes';
import './InventarioPage.css';

const TABS = [
  { id: 'productos',  label: 'Productos'   },
  { id: 'categorias', label: 'Categorías'  },
  { id: 'proveedores',label: 'Proveedores' },
  { id: 'clientes',   label: 'Clientes'    },
] as const;
type TabId = typeof TABS[number]['id'];

export default function InventarioPage() {
  const [active, setActive] = useState<TabId>('productos');
  return (
    <div className="upage">
      <div className="upage__header">
        <div>
          <h2 className="upage__title">Inventario</h2>
          <p className="upage__subtitle">Gestiona productos, categorías, proveedores y clientes</p>
        </div>
      </div>
      <div className="upage__tabs">
        {TABS.map(({ id, label }) => (
          <button key={id} className={`upage__tab${active === id ? ' upage__tab--active' : ''}`} onClick={() => setActive(id)}>
            {label}
          </button>
        ))}
      </div>
      <div>
        {active === 'productos'  && <TabProductos />}
        {active === 'categorias' && <TabCategorias />}
        {active === 'proveedores'&& <TabProveedores />}
        {active === 'clientes'   && <TabClientes />}
      </div>
    </div>
  );
}
