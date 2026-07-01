import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { usuariosService } from '../../../services/usuariosService';
import { useAuth } from '../../../contexts/AuthContext';
import { canCreate, canEdit, canDelete } from '../../../utils/permissions';
import {
  SYSTEM_MODULES, SYSTEM_ACTIONS,
  defaultPermissions, parsePermissions, serializePermissions,
} from '../../../types/usuarios';
import type { Rol, Permissions } from '../../../types/usuarios';

interface RolForm { nombre: string; permisos: Permissions; }

export default function TabRoles() {
  const { user: me } = useAuth();
  const [roles,   setRoles]   = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<Rol | null>(null);
  const [form,    setForm]    = useState<RolForm>({ nombre: '', permisos: defaultPermissions() });
  const [saving,  setSaving]  = useState(false);
  const [mError,  setMError]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRoles(await usuariosService.listRoles()); }
    catch { setError('No se pudieron cargar los roles.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', permisos: defaultPermissions() });
    setMError(null); setOpen(true);
  };
  const openEdit = (r: Rol) => {
    setEditing(r);
    setForm({ nombre: r.nombre, permisos: parsePermissions(r.permisos) });
    setMError(null); setOpen(true);
  };

  const togglePerm = (mod: string, act: string, val: boolean) => {
    setForm(f => ({
      ...f,
      permisos: {
        ...f.permisos,
        [mod]: { ...(f.permisos as Record<string, Record<string, boolean>>)[mod], [act]: val },
      } as Permissions,
    }));
  };

  const handleSave = async () => {
    setMError(null);
    if (!form.nombre.trim()) { setMError('El nombre del rol es obligatorio.'); return; }
    setSaving(true);
    try {
      const payload = {
        empresa: me!.empresa_id,
        nombre: form.nombre.trim(),
        permisos: serializePermissions(form.permisos),
      };
      if (editing) {
        const updated = await usuariosService.updateRol(editing.id, payload);
        setRoles(p => p.map(r => r.id === updated.id ? updated : r));
      } else {
        const created = await usuariosService.createRol(payload);
        setRoles(p => [...p, created]);
      }
      setOpen(false);
    } catch (err) {
      setMError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (r: Rol) => {
    if ((r.usuarios_count ?? 0) > 0) {
      alert('No se puede eliminar un rol con usuarios activos asignados.'); return;
    }
    if (!window.confirm(`¿Eliminar el rol "${r.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await usuariosService.deleteRol(r.id);
      setRoles(p => p.filter(x => x.id !== r.id));
    } catch { alert('No se pudo eliminar el rol.'); }
  };

  if (loading) return <div className="table-empty">Cargando roles…</div>;
  if (error)   return <div className="table-empty" style={{color:'#f87171'}}>{error}</div>;

  return (
    <>
      <div className="tab-toolbar">
        <div className="tab-toolbar__left"/>
        {canCreate(me, 'usuarios') && (
          <button className="btn-primary" onClick={openCreate}><Plus size={14}/>Nuevo Rol</button>
        )}
      </div>

      <div className="table-wrap">
        <table className="erp-table">
          <thead><tr>
            <th>Nombre del Rol</th><th>Usuarios activos</th><th>Módulos con acceso</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            {roles.length === 0
              ? <tr><td colSpan={4} className="table-empty">No hay roles configurados.</td></tr>
              : roles.map(r => {
                const perms = parsePermissions(r.permisos);
                const modsWithAccess = SYSTEM_MODULES.filter(m =>
                  Object.values(perms[m.key]).some(Boolean)
                );
                return (
                  <tr key={r.id}>
                    <td><strong style={{color:'#e2e8f0'}}>{r.nombre}</strong></td>
                    <td><span className="badge badge--count">{r.usuarios_count ?? 0} usuarios</span></td>
                    <td>
                      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                        {modsWithAccess.length === 0
                          ? <span style={{color:'#374151',fontSize:'0.78rem'}}>Sin acceso</span>
                          : modsWithAccess.map(m =>
                            <span key={m.key} className="badge badge--role" style={{fontSize:'0.62rem'}}>{m.label}</span>
                          )}
                      </div>
                    </td>
                    <td><div className="td-actions">
                      {canEdit(me, 'usuarios') && (
                        <button className="btn-icon btn-icon--warn" title="Editar permisos" onClick={() => openEdit(r)}>
                          <Edit2 size={13}/>
                        </button>
                      )}
                      {canDelete(me, 'usuarios') && (
                        <button className="btn-icon btn-icon--danger" title="Eliminar rol" onClick={() => handleDelete(r)}>
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </div></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal-card modal-card--wide">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Rol' : 'Nuevo Rol'}</h3>
              <button className="modal-close" onClick={() => setOpen(false)}><X size={15}/></button>
            </div>
            <div className="modal-body">
              {mError && <div className="modal-error">{mError}</div>}
              <div className="modal-row modal-row-1">
                <div className="m-field">
                  <label className="m-field__label">Nombre del rol *</label>
                  <input className="m-field__input" value={form.nombre}
                    onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
                    placeholder="Ej: Vendedor, Supervisor…"/>
                </div>
              </div>

              {/* Permission matrix */}
              <div>
                <p className="perm-label">Permisos por módulo</p>
                <div className="perm-matrix-wrap">
                  <table className="perm-matrix">
                    <thead><tr>
                      <th>Módulo</th>
                      {SYSTEM_ACTIONS.map(a => <th key={a.key}>{a.label}</th>)}
                    </tr></thead>
                    <tbody>
                      {SYSTEM_MODULES.map(m => (
                        <tr key={m.key}>
                          <td>{m.label}</td>
                          {SYSTEM_ACTIONS.map(a => (
                            <td key={a.key}>
                              <input
                                type="checkbox"
                                className="perm-cb"
                                checked={(form.permisos as Record<string, Record<string, boolean>>)[m.key]?.[a.key] ?? false}
                                onChange={e => togglePerm(m.key, a.key, e.target.checked)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear rol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
