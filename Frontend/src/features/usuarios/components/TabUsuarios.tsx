import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Power, X } from 'lucide-react';
import { usuariosService } from '../../../services/usuariosService';
import { useAuth } from '../../../hooks/useAuth';
import { canCreate, canEdit } from '../../../utils/permissions';
import { confirmAction, notifyError, notifySuccess } from '../../../utils/notify';
import type { UsuarioRead, UsuarioWrite, Rol, Sucursal } from '../../../types/usuarios';

interface UserForm {
  nombre: string; username: string; correo: string;
  cedula: string; telefono: string;
  rol: string; sucursal: string; password: string;
}
const EMPTY: UserForm = {
  nombre:'', username:'', correo:'', cedula:'', telefono:'', rol:'', sucursal:'', password:'',
};

export default function TabUsuarios() {
  const { user: me } = useAuth();
  const [usuarios,   setUsuarios]   = useState<UsuarioRead[]>([]);
  const [roles,      setRoles]      = useState<Rol[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [search,     setSearch]     = useState('');

  const [open,       setOpen]       = useState(false);
  const [editing,    setEditing]    = useState<UsuarioRead | null>(null);
  const [form,       setForm]       = useState<UserForm>(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [mError,     setMError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [us, rols, sucs] = await Promise.all([
        usuariosService.listUsuarios(),
        usuariosService.listRoles(),
        usuariosService.listSucursales(),
      ]);
      setUsuarios(us); setRoles(rols); setSucursales(sucs);
    } catch { setError('No se pudieron cargar los datos.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const filtered = usuarios.filter(u =>
    `${u.nombre} ${u.username} ${u.correo ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null); setForm(EMPTY); setMError(null); setOpen(true);
  };
  const openEdit = (u: UsuarioRead) => {
    setEditing(u);
    setForm({
      nombre: u.nombre, username: u.username,
      correo: u.correo ?? '', cedula: u.cedula ?? '',
      telefono: u.telefono ?? '', rol: String(u.rol),
      sucursal: u.sucursal ? String(u.sucursal) : '', password: '',
    });
    setMError(null); setOpen(true);
  };

  const field = (k: keyof UserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setMError(null);
    if (!form.nombre.trim() || !form.username.trim() || !form.rol) {
      setMError('Nombre, usuario y rol son obligatorios.'); return;
    }
    if (!editing && !form.password.trim()) {
      setMError('La contraseña es obligatoria al crear el usuario.'); return;
    }
    setSaving(true);
    try {
      const payload: UsuarioWrite = {
        empresa: me!.empresa_id, rol: Number(form.rol),
        sucursal: form.sucursal ? Number(form.sucursal) : null,
        nombre: form.nombre.trim(), username: form.username.trim(),
        correo:   form.correo.trim()   || null,
        cedula:   form.cedula.trim()   || null,
        telefono: form.telefono.trim() || null,
      };
      if (form.password.trim()) payload.password = form.password.trim();

      if (editing) {
        const u = await usuariosService.updateUsuario(editing.id, payload);
        setUsuarios(p => p.map(x => x.id === u.id ? u : x));
      } else {
        const u = await usuariosService.createUsuario({ ...payload, password: form.password.trim() });
        setUsuarios(p => [...p, u]);
      }
      setOpen(false);
      await notifySuccess(editing ? 'Usuario actualizado' : 'Usuario creado');
    } catch (err) {
      setMError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const handleToggle = async (u: UsuarioRead) => {
    const ok = await confirmAction(
      u.activo ? 'Desactivar usuario' : 'Reactivar usuario',
      u.activo
        ? `¿Desactivar el perfil de "${u.nombre}"?`
        : `¿Reactivar el perfil de "${u.nombre}"?`,
      u.activo ? 'Sí, desactivar' : 'Sí, reactivar',
    );
    if (!ok) return;
    try {
      const r = await usuariosService.toggleActivo(u.id);
      setUsuarios(p => p.map(x => x.id === u.id ? { ...x, activo: r.activo } : x));
      await notifySuccess(r.activo ? 'Usuario activado' : 'Usuario desactivado');
    } catch { await notifyError('No se pudo cambiar el estado del usuario.'); }
  };

  if (loading) return <div className="table-empty">Cargando usuarios…</div>;
  if (error)   return <div className="table-empty" style={{color:'#f87171'}}>{error}</div>;

  return (
    <>
      <div className="tab-toolbar">
        <div className="tab-toolbar__left">
          <div className="tab-search">
            <Search size={13} className="tab-search__icon" />
            <input className="tab-search__input" placeholder="Buscar por nombre, usuario o correo…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {canCreate(me, 'usuarios') && (
          <button className="btn-primary" onClick={openCreate}><Plus size={14}/>Nuevo Usuario</button>
        )}
      </div>

      <div className="table-wrap">
        <table className="erp-table">
          <thead><tr>
            <th>Perfil</th><th>Correo</th><th>Rol</th>
            <th>Sucursal</th><th>Estado</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} className="table-empty">No se encontraron usuarios.</td></tr>
              : filtered.map(u => (
              <tr key={u.id}>
                <td className="td-name">
                  <strong>{u.nombre}</strong><span>@{u.username}</span>
                </td>
                <td>{u.correo || <span style={{color:'#374151'}}>—</span>}</td>
                <td><span className="badge badge--role">{u.rol_nombre}</span></td>
                <td>{u.sucursal_nombre || <span style={{color:'#374151'}}>—</span>}</td>
                <td>
                  <span className={`badge badge--${u.activo ? 'active' : 'inactive'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td><div className="td-actions">
                  {canEdit(me, 'usuarios') && (
                    <button className="btn-icon btn-icon--warn" title="Editar" onClick={() => openEdit(u)}>
                      <Edit2 size={13}/>
                    </button>
                  )}
                  {canEdit(me, 'usuarios') && (
                    <button
                      className={`btn-icon btn-icon--${u.activo ? 'danger' : 'on'}`}
                      title={u.activo ? 'Desactivar' : 'Activar'}
                      onClick={() => handleToggle(u)}
                    >
                      <Power size={13}/>
                    </button>
                  )}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="modal-close" onClick={() => setOpen(false)}><X size={15}/></button>
            </div>
            <div className="modal-body">
              {mError && <div className="modal-error">{mError}</div>}
              <div className="modal-row">
                <div className="m-field">
                  <label className="m-field__label">Nombre completo *</label>
                  <input className="m-field__input" value={form.nombre} onChange={field('nombre')} placeholder="Ej: Juan Pérez"/>
                </div>
                <div className="m-field">
                  <label className="m-field__label">Usuario *</label>
                  <input className="m-field__input" value={form.username} onChange={field('username')} placeholder="Ej: jperez" autoComplete="off"/>
                </div>
              </div>
              <div className="modal-row">
                <div className="m-field">
                  <label className="m-field__label">Correo electrónico</label>
                  <input type="email" className="m-field__input" value={form.correo} onChange={field('correo')} placeholder="correo@empresa.com"/>
                </div>
                <div className="m-field">
                  <label className="m-field__label">Cédula</label>
                  <input className="m-field__input" value={form.cedula} onChange={field('cedula')} placeholder="123456789"/>
                </div>
              </div>
              <div className="modal-row">
                <div className="m-field">
                  <label className="m-field__label">Teléfono</label>
                  <input className="m-field__input" value={form.telefono} onChange={field('telefono')} placeholder="+57 300 000 0000"/>
                </div>
                <div className="m-field">
                  <label className="m-field__label">Rol *</label>
                  <select className="m-field__select" value={form.rol} onChange={field('rol')}>
                    <option value="">Seleccionar rol…</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-row">
                <div className="m-field">
                  <label className="m-field__label">Sucursal</label>
                  <select className="m-field__select" value={form.sucursal} onChange={field('sucursal')}>
                    <option value="">Sin sucursal</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div className="m-field">
                  <label className="m-field__label">
                    {editing ? 'Nueva contraseña (vacío = sin cambios)' : 'Contraseña *'}
                  </label>
                  <input type="password" className="m-field__input" value={form.password} onChange={field('password')}
                    placeholder={editing ? 'Dejar vacío para mantener' : 'Mínimo 6 caracteres'} autoComplete="new-password"/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
