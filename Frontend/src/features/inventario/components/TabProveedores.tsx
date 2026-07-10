import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, X } from 'lucide-react';
import { inventarioService } from '../../../services/inventarioService';
import { useAuth } from '../../../hooks/useAuth';
import { canCreate, canEdit } from '../../../utils/permissions';
import { notifySuccess } from '../../../utils/notify';
import type { Proveedor } from '../../../types/inventario';

export default function TabProveedores() {
  const { user: me } = useAuth();
  const [list,    setList]    = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<Proveedor|null>(null);
  const [form,    setForm]    = useState({ nombre:'', nit:'', telefono:'', direccion:'', activo:'1' });
  const [saving,  setSaving]  = useState(false);
  const [mError,  setMError]  = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await inventarioService.listProveedores()); }
    catch { /* silently */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const filtered = list.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(p => ({...p, [k]: e.target.value}));

  const openCreate = () => { setEditing(null); setForm({nombre:'',nit:'',telefono:'',direccion:'',activo:'1'}); setMError(null); setOpen(true); };
  const openEdit   = (p: Proveedor) => { setEditing(p); setForm({nombre:p.nombre,nit:p.nit??'',telefono:p.telefono??'',direccion:p.direccion??'',activo:String(p.activo)}); setMError(null); setOpen(true); };

  const handleSave = async () => {
    setMError(null);
    if (!form.nombre.trim()) { setMError('El nombre es obligatorio.'); return; }
    setSaving(true);
    try {
      const d = { empresa:me!.empresa_id, nombre:form.nombre.trim(), nit:form.nit.trim()||null, telefono:form.telefono.trim()||null, direccion:form.direccion.trim()||null, activo:Number(form.activo) };
      if (editing) { const u = await inventarioService.updateProveedor(editing.id, d); setList(p => p.map(x => x.id===u.id?u:x)); }
      else         { const u = await inventarioService.createProveedor(d as Omit<Proveedor,'id'>); setList(p => [...p, u]); }
      setOpen(false);
      await notifySuccess(editing ? 'Proveedor actualizado' : 'Proveedor creado');
    } catch(e) { setMError(e instanceof Error ? e.message : 'Error al guardar.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="table-empty">Cargando…</div>;

  return (
    <>
      <div className="tab-toolbar">
        <div className="tab-toolbar__left">
          <div className="tab-search"><Search size={13} className="tab-search__icon"/><input className="tab-search__input" placeholder="Buscar proveedor…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        </div>
        {canCreate(me,'compras')&&<button className="btn-primary" onClick={openCreate}><Plus size={14}/>Nuevo Proveedor</button>}
      </div>
      <div className="table-wrap">
        <table className="erp-table">
          <thead><tr><th>Nombre</th><th>NIT</th><th>Teléfono</th><th>Dirección</th><th>Estado</th>{canEdit(me,'compras')&&<th>Acciones</th>}</tr></thead>
          <tbody>
            {filtered.length===0
              ? <tr><td colSpan={6} className="table-empty">No hay proveedores.</td></tr>
              : filtered.map(p => (
              <tr key={p.id}>
                <td><strong style={{color:'#e2e8f0'}}>{p.nombre}</strong></td>
                <td className="td-mono">{p.nit||<span style={{color:'#374151'}}>—</span>}</td>
                <td>{p.telefono||<span style={{color:'#374151'}}>—</span>}</td>
                <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.direccion||<span style={{color:'#374151'}}>—</span>}</td>
                <td><span className={`badge badge--${p.activo?'active':'inactive'}`}>{p.activo?'Activo':'Inactivo'}</span></td>
                {canEdit(me,'compras')&&<td><div className="td-actions"><button className="btn-icon btn-icon--warn" onClick={()=>openEdit(p)}><Edit2 size={13}/></button></div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
          <div className="modal-card modal-card--wide">
            <div className="modal-header"><h3 className="modal-title">{editing?'Editar Proveedor':'Nuevo Proveedor'}</h3><button className="modal-close" onClick={()=>setOpen(false)}><X size={15}/></button></div>
            <div className="modal-body">
              {mError&&<div className="modal-error">{mError}</div>}
              <div className="modal-row"><div className="m-field"><label className="m-field__label">Nombre *</label><input className="m-field__input" value={form.nombre} onChange={f('nombre')} placeholder="Nombre del proveedor"/></div>
              <div className="m-field"><label className="m-field__label">NIT</label><input className="m-field__input" value={form.nit} onChange={f('nit')} placeholder="900.000.000-0"/></div></div>
              <div className="modal-row"><div className="m-field"><label className="m-field__label">Teléfono</label><input className="m-field__input" value={form.telefono} onChange={f('telefono')} placeholder="+57 300 000 0000"/></div>
              <div className="m-field"><label className="m-field__label">Estado</label><select className="m-field__select" value={form.activo} onChange={f('activo')}><option value="1">Activo</option><option value="0">Inactivo</option></select></div></div>
              <div className="modal-row modal-row-1"><div className="m-field"><label className="m-field__label">Dirección</label><input className="m-field__input" value={form.direccion} onChange={f('direccion')} placeholder="Dirección"/></div></div>
            </div>
            <div className="modal-footer"><button className="btn-cancel" onClick={()=>setOpen(false)}>Cancelar</button><button className="btn-save" onClick={handleSave} disabled={saving}>{saving?'Guardando…':editing?'Guardar cambios':'Crear proveedor'}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
