import { useState, useEffect, useCallback } from 'react';
import { usuariosService } from '../../../services/usuariosService';
import { SYSTEM_MODULES } from '../../../types/usuarios';
import type { LogActividad, UsuarioRead } from '../../../types/usuarios';

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
    + ' ' + d.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
}

export default function TabLogs() {
  const [logs,     setLogs]     = useState<LogActividad[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioRead[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filtUser, setFiltUser] = useState('');
  const [filtMod,  setFiltMod]  = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const filters: { usuario?: number; modulo?: string } = {};
      if (filtUser) filters.usuario = Number(filtUser);
      if (filtMod)  filters.modulo  = filtMod;
      setLogs(await usuariosService.listLogs(filters));
    } catch { setError('No se pudieron cargar los logs.'); }
    finally { setLoading(false); }
  }, [filtUser, filtMod]);

  // Load users once for the filter dropdown
  useEffect(() => {
    usuariosService.listUsuarios().then(setUsuarios).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="tab-toolbar">
        <div className="tab-toolbar__left">
          <select className="tab-select" value={filtUser} onChange={e => setFiltUser(e.target.value)}>
            <option value="">Todos los usuarios</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} (@{u.username})</option>)}
          </select>
          <select className="tab-select" value={filtMod} onChange={e => setFiltMod(e.target.value)}>
            <option value="">Todos los módulos</option>
            {SYSTEM_MODULES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="table-empty">Cargando logs…</div>}
      {error   && <div className="table-empty" style={{color:'#f87171'}}>{error}</div>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="erp-table">
            <thead><tr>
              <th>Fecha</th><th>Usuario</th><th>Módulo</th>
              <th>Acción</th><th>Descripción</th>
            </tr></thead>
            <tbody>
              {logs.length === 0
                ? <tr><td colSpan={5} className="table-empty">No se encontraron registros.</td></tr>
                : logs.map(l => (
                <tr key={l.id}>
                  <td className="log-date">{fmtDate(l.fecha)}</td>
                  <td className="td-name">
                    <strong>{l.usuario_nombre}</strong>
                    <span>@{l.usuario_username}</span>
                  </td>
                  <td>{l.modulo ? <span className="log-module">{l.modulo}</span> : <span style={{color:'#374151'}}>—</span>}</td>
                  <td><span className="log-action">{l.accion}</span></td>
                  <td style={{maxWidth:280, color:'#64748b', fontSize:'0.8rem'}}>
                    {l.descripcion || <span style={{color:'#374151'}}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
