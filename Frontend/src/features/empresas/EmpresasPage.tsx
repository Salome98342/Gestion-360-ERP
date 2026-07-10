import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { empresasService } from '../../services/empresasService';
import { canEdit } from '../../utils/permissions';
import { notifyError, notifySuccess } from '../../utils/notify';
import type { Empresa } from '../../types/empresas';
import './EmpresasPage.css';

const MONEDAS = ['COP','USD','EUR','PEN','MXN','ARS','BRL'];

export default function EmpresasPage() {
  const { user: me } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa|null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string|null>(null);

  const [form, setForm] = useState({
    nombre:'', nit:'', direccion:'', telefono:'', moneda:'COP', porcentaje_impuesto:'0',
  });

  useEffect(() => {
    if (!me?.empresa_id) return;
    empresasService.getEmpresa(me.empresa_id)
      .then(e => {
        setEmpresa(e);
        setForm({ nombre:e.nombre, nit:e.nit??'', direccion:e.direccion??'', telefono:e.telefono??'', moneda:e.moneda, porcentaje_impuesto:String(e.porcentaje_impuesto) });
      })
      .catch(() => setError('No se pudo cargar la empresa.'))
      .finally(() => setLoading(false));
  }, [me]);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(p => ({...p, [k]: e.target.value}));

  const handleSave = async () => {
    if (!empresa) return;
    setSaving(true); setError(null); setSuccess(false);
    try {
      const u = await empresasService.updateEmpresa(empresa.id, {
        nombre: form.nombre.trim(), nit: form.nit.trim()||null,
        direccion: form.direccion.trim()||null, telefono: form.telefono.trim()||null,
        moneda: form.moneda, porcentaje_impuesto: Number(form.porcentaje_impuesto),
      });
      setEmpresa(u); setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await notifySuccess('Empresa actualizada', 'Los cambios se guardaron correctamente.');
    } catch {
      setError('Error al guardar los cambios.');
      await notifyError('No se pudieron guardar los cambios de la empresa.');
    }
    finally { setSaving(false); }
  };

  if (loading) return <div className="upage"><div className="table-empty">Cargando empresa…</div></div>;

  return (
    <div className="upage">
      <div className="upage__header">
        <div>
          <h2 className="upage__title">Empresa</h2>
          <p className="upage__subtitle">Información y configuración de la empresa</p>
        </div>
      </div>

      <div className="form-page-card">
        <div className="form-page-section">
          <h4 className="form-page-section__title">Datos generales</h4>
          {error   && <div className="modal-error" style={{marginBottom:12}}>{error}</div>}
          {success && <div className="empresa-success">Cambios guardados correctamente.</div>}

          <div className="modal-row">
            <div className="m-field"><label className="m-field__label">Nombre de la empresa *</label>
              <input className="m-field__input" value={form.nombre} onChange={f('nombre')} placeholder="Mi Empresa S.A.S"/>
            </div>
            <div className="m-field"><label className="m-field__label">NIT / RUT</label>
              <input className="m-field__input" value={form.nit} onChange={f('nit')} placeholder="900.000.000-0"/>
            </div>
          </div>
          <div className="modal-row">
            <div className="m-field"><label className="m-field__label">Teléfono</label>
              <input className="m-field__input" value={form.telefono} onChange={f('telefono')} placeholder="+57 300 000 0000"/>
            </div>
            <div className="m-field"><label className="m-field__label">Dirección</label>
              <input className="m-field__input" value={form.direccion} onChange={f('direccion')} placeholder="Calle 10 # 5-30"/>
            </div>
          </div>
        </div>

        <div className="form-page-section">
          <h4 className="form-page-section__title">Configuración financiera</h4>
          <div className="modal-row">
            <div className="m-field"><label className="m-field__label">Moneda</label>
              <select className="m-field__select" value={form.moneda} onChange={f('moneda')}>
                {MONEDAS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="m-field"><label className="m-field__label">% Impuesto (IVA)</label>
              <input type="number" className="m-field__input" value={form.porcentaje_impuesto} onChange={f('porcentaje_impuesto')} min="0" max="100" step="0.5" placeholder="19"/>
            </div>
          </div>
        </div>

        {canEdit(me,'empresas') && (
          <div className="form-page-actions">
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              <Save size={14}/>{saving?'Guardando…':'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
