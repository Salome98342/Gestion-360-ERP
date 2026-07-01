import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { inventarioService } from '../../../services/inventarioService';
import type { Cliente, TipoCliente } from '../../../types/inventario';

function fmt(n: number) { return n.toLocaleString('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }); }

export default function TabClientes() {
  const [clientes,  setClientes]  = useState<Cliente[]>([]);
  const [tipos,     setTipos]     = useState<TipoCliente[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filtActivo,setFiltActivo]= useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([inventarioService.listClientes(), inventarioService.listTiposCliente()]);
      setClientes(c); setTipos(t);
    } catch { /* silently */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const tipoMap = Object.fromEntries(tipos.map(t => [t.id, t.nombre]));
  const filtered = clientes.filter(c => {
    const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase());
    const matchActivo = filtActivo === '' || String(c.activo) === filtActivo;
    return matchSearch && matchActivo;
  });

  if (loading) return <div className="table-empty">Cargando…</div>;

  return (
    <>
      <div className="tab-toolbar">
        <div className="tab-toolbar__left">
          <div className="tab-search"><Search size={13} className="tab-search__icon"/><input className="tab-search__input" placeholder="Buscar cliente…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select className="tab-select" value={filtActivo} onChange={e=>setFiltActivo(e.target.value)}>
            <option value="">Todos</option><option value="1">Activos</option><option value="0">Inactivos</option>
          </select>
        </div>
      </div>
      <div className="table-wrap">
        <table className="erp-table">
          <thead><tr><th>Nombre</th><th>Teléfono</th><th>Tipo cliente</th><th>Saldo actual</th><th>Estado</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={5} className="table-empty">No hay clientes.</td></tr>
              : filtered.map(c => (
              <tr key={c.id}>
                <td><strong style={{color:'#e2e8f0'}}>{c.nombre}</strong></td>
                <td>{c.telefono||<span style={{color:'#374151'}}>—</span>}</td>
                <td>{c.tipo_cliente ? (tipoMap[c.tipo_cliente]||'—') : <span style={{color:'#374151'}}>—</span>}</td>
                <td className="td-num" style={{color: c.saldo_actual>0?'#f87171':'#94a3b8'}}>{fmt(c.saldo_actual)}</td>
                <td><span className={`badge badge--${c.activo?'active':'inactive'}`}>{c.activo?'Activo':'Inactivo'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
