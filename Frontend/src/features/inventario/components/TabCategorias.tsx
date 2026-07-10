import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { inventarioService } from '../../../services/inventarioService';
import { useAuth } from '../../../hooks/useAuth';
import { canCreate, canEdit, canDelete } from '../../../utils/permissions';
import { confirmAction, notifyError, notifySuccess } from '../../../utils/notify';
import type { Categoria } from '../../../types/inventario';

export default function TabCategorias() {
  const { user: me } = useAuth();
  const [cats,    setCats]    = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<Categoria|null>(null);
  const [form,    setForm]    = useState({ nombre:'', descripcion:'' });
  const [saving,  setSaving]  = useState(false);
  const [mError,  setMError]  = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCats(await inventarioService.listCategorias()); }
    catch { /* silently */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const filtered = cats.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm({nombre:'',descripcion:''}); setMError(null); setOpen(true); };
  const openEdit   = (c: Categoria) => { setEditing(c); setForm({nombre:c.nombre, descripcion:c.descripcion??''}); setMError(null); setOpen(true); };

  const handleSave = async () => {
    setMError(null);
    if (!form.nombre.trim()) { setMError('El nombre es obligatorio.'); return; }
    setSaving(true);
    try {
      const d = { empresa: me!.empresa_id, nombre: form.nombre.trim(), descripcion: form.descripcion.trim()||null };
      if (editing) { const u = await inventarioService.updateCategoria(editing.id, d); setCats(p => p.map(x => x.id===u.id?u:x)); }
      else         { const u = await inventarioService.createCategoria(d);             setCats(p => [...p, u]); }
      setOpen(false);
      await notifySuccess(editing ? 'Categoría actualizada' : 'Categoría creada');
    } catch (e) { setMError(e instanceof Error ? e.message : 'Error al guardar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c: Categoria) => {
    const ok = await confirmAction('Eliminar categoría', `¿Eliminar la categoría "${c.nombre}"?`, 'Sí, eliminar');
    if (!ok) return;
    try {
      await inventarioService.deleteCategoria(c.id);
      setCats(p => p.filter(x => x.id!==c.id));
      await notifySuccess('Categoría eliminada');
    }
    catch { await notifyError('No se pudo eliminar la categoría.'); }
  };

  if (loading) return <div className="table-empty">Cargando…</div>;

  return (
    <>
      <div className="tab-toolbar">
        <div className="tab-toolbar__left">
          <div className="tab-search"><Search size={13} className="tab-search__icon"/>
            <input className="tab-search__input" placeholder="Buscar categoría…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>
        {canCreate(me,'inventario') && <button className="btn-primary" onClick={openCreate}><Plus size={14}/>Nueva Categoría</button>}
      </div>
      <div className="table-wrap">
        <table className="erp-table">
          <thead><tr><th>Nombre</th><th>Descripción</th><th>Estado</th>{(canEdit(me,'inventario')||canDelete(me,'inventario'))&&<th>Acciones</th>}</tr></thead>
          <tbody>
            {filtered.length===0
              ? <tr><td colSpan={4} className="table-empty">No hay categorías.</td></tr>
              : filtered.map(c => (
              <tr key={c.id}>
                <td><strong style={{color:'#e2e8f0'}}>{c.nombre}</strong></td>
                <td>{c.descripcion||<span style={{color:'#374151'}}>—</span>}</td>
                <td><span className={`badge badge--${c.activa?'active':'inactive'}`}>{c.activa?'Activa':'Inactiva'}</span></td>
                {(canEdit(me,'inventario')||canDelete(me,'inventario'))&&(
                  <td><div className="td-actions">
                    {canEdit(me,'inventario')   && <button className="btn-icon btn-icon--warn"   onClick={() => openEdit(c)}><Edit2 size={13}/></button>}
                    {canDelete(me,'inventario') && <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(c)}><Trash2 size={13}/></button>}
                  </div></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setOpen(false); }}>
          <div className="modal-card">
            <div className="modal-header"><h3 className="modal-title">{editing?'Editar Categoría':'Nueva Categoría'}</h3><button className="modal-close" onClick={()=>setOpen(false)}><X size={15}/></button></div>
            <div className="modal-body">
              {mError&&<div className="modal-error">{mError}</div>}
              <div className="modal-row modal-row-1"><div className="m-field"><label className="m-field__label">Nombre *</label><input className="m-field__input" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Bebidas"/></div></div>
              <div className="modal-row modal-row-1"><div className="m-field"><label className="m-field__label">Descripción</label><input className="m-field__input" value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Descripción opcional"/></div></div>
            </div>
            <div className="modal-footer"><button className="btn-cancel" onClick={()=>setOpen(false)}>Cancelar</button><button className="btn-save" onClick={handleSave} disabled={saving}>{saving?'Guardando…':editing?'Guardar cambios':'Crear categoría'}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
