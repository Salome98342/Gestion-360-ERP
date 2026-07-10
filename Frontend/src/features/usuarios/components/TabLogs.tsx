import { useState, useEffect, useCallback } from 'react';
import { usuariosService } from '../../../services/usuariosService';
import { SYSTEM_MODULES } from '../../../types/usuarios';
import type { LogActividad, UsuarioRead } from '../../../types/usuarios';
import { useAuth } from '../../../hooks/useAuth';
import { isAdminUser } from '../../../utils/permissions';

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
    + ' ' + d.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
}

function fmtAccion(accion: string) {
  const clean = (accion || '').trim();
  if (!clean) return 'Sin accion';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export default function TabLogs() {
  const { user } = useAuth();
  const admin = isAdminUser(user);
  const [logs,     setLogs]     = useState<LogActividad[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioRead[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filtUser, setFiltUser] = useState('');
  const [filtMod,  setFiltMod]  = useState('');
  const [filtQ,    setFiltQ]    = useState('');

  const load = useCallback(async () => {
    if (!admin) {
      setLoading(false);
      setLogs([]);
      return;
    }
    setLoading(true); setError(null);
    try {
      const filters: { usuario?: number; modulo?: string; q?: string; limit?: number } = { limit: 250 };
      if (filtUser) filters.usuario = Number(filtUser);
      if (filtMod)  filters.modulo  = filtMod;
      if (filtQ.trim()) filters.q = filtQ.trim();
      setLogs(await usuariosService.listLogs(filters));
    } catch { setError('No se pudieron cargar los logs.'); }
    finally { setLoading(false); }
  }, [admin, filtUser, filtMod, filtQ]);

  // Load users once for the filter dropdown
  useEffect(() => {
    if (!admin) return;
    usuariosService.listUsuarios().then(setUsuarios).catch(() => {});
  }, [admin]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (!admin) return;
    const id = window.setInterval(() => {
      load().catch(() => {});
    }, 30000);
    return () => window.clearInterval(id);
  }, [admin, load]);

  if (!admin) {
    return <div className="table-empty">Esta sección está disponible solo para el administrador.</div>;
  }

  return (
    <>
      <div className="tab-toolbar">
        <div className="tab-toolbar__left">
          <input
            className="tab-search"
            placeholder="Buscar acción o descripción..."
            value={filtQ}
            onChange={e => setFiltQ(e.target.value)}
          />
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
                  <td><span className="log-action">{fmtAccion(l.accion)}</span></td>
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
