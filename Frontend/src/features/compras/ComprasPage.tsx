import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { ventasService } from '../../services/ventasService';
import type { Compra } from '../../types/ventas';
import { COMPRA_ESTADOS } from '../../types/ventas';
import './ComprasPage.css';

function fmt(n: number) { return n.toLocaleString('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }); }
function fmtDate(s: string) { return new Date(s).toLocaleString('es-CO', { dateStyle:'short', timeStyle:'short' }); }

const ESTADO_CLASS: Record<string, string> = { PAGADO:'active', PENDIENTE:'warn', ANULADO:'inactive' };

export default function ComprasPage() {
  const [compras,    setCompras]    = useState<Compra[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string|null>(null);
  const [search,     setSearch]     = useState('');
  const [filtEstado, setFiltEstado] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setCompras(await ventasService.listCompras(filtEstado||undefined)); }
    catch { setError('No se pudieron cargar las compras.'); }
    finally { setLoading(false); }
  }, [filtEstado]);
  useEffect(() => { load(); }, [load]);

  const filtered = compras.filter(c =>
    c.proveedor_nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.usuario_nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="upage">
      <div className="upage__header">
        <div>
          <h2 className="upage__title">Compras</h2>
          <p className="upage__subtitle">Historial de órdenes de compra</p>
        </div>
      </div>
      <div className="tab-toolbar">
        <div className="tab-toolbar__left">
          <div className="tab-search"><Search size={13} className="tab-search__icon"/>
            <input className="tab-search__input" placeholder="Buscar proveedor o responsable…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="tab-select" value={filtEstado} onChange={e=>setFiltEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {COMPRA_ESTADOS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {error   && <div className="table-empty" style={{color:'#f87171'}}>{error}</div>}
      {loading && <div className="table-empty">Cargando compras…</div>}
      {!loading && !error && (
        <div className="table-wrap">
          <table className="erp-table">
            <thead><tr>
              <th>Fecha</th><th>Proveedor</th><th>Responsable</th><th>Sucursal</th>
              <th>Subtotal</th><th>Impuesto</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Estado</th>
            </tr></thead>
            <tbody>
              {filtered.length===0
                ? <tr><td colSpan={10} className="table-empty">No se encontraron compras.</td></tr>
                : filtered.map(c=>(
                <tr key={c.id}>
                  <td className="td-mono" style={{whiteSpace:'nowrap'}}>{fmtDate(c.fecha)}</td>
                  <td className="td-name">{c.proveedor_nombre}</td>
                  <td>{c.usuario_nombre}</td>
                  <td>{c.sucursal_nombre||<span style={{color:'#374151'}}>—</span>}</td>
                  <td className="td-num">{fmt(c.subtotal)}</td>
                  <td className="td-num" style={{color:'#fbbf24'}}>{fmt(c.impuesto)}</td>
                  <td className="td-num" style={{fontWeight:700,color:'#e2e8f0'}}>{fmt(c.total)}</td>
                  <td className="td-num" style={{color:'#4ade80'}}>{fmt(c.total_pagado)}</td>
                  <td className="td-num" style={{color:c.saldo_pendiente>0?'#f87171':'#94a3b8'}}>{fmt(c.saldo_pendiente)}</td>
                  <td><span className={`badge badge--${ESTADO_CLASS[c.estado]||'inactive'}`}>{c.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
