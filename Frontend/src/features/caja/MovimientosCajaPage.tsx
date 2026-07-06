import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { reportesService } from '../../services/reportesService';
import type { Caja, MovimientoCaja } from '../../types/reportes';
import { ApiHttpError, isLicenseErrorData, licenseErrorMessage } from '../../utils/httpError';
import './MovimientosCajaPage.css';

function fmtMoney(n: number) {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

export default function MovimientosCajaPage() {
  const { user } = useAuth();

  const [cajas, setCajas] = useState<Caja[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [montoInicial, setMontoInicial] = useState('0');
  const [cerrarCajaId, setCerrarCajaId] = useState('');
  const [montoCierre, setMontoCierre] = useState('0');

  const [movCajaId, setMovCajaId] = useState('');
  const [movTipo, setMovTipo] = useState('INGRESO');
  const [movMonto, setMovMonto] = useState('0');
  const [movConcepto, setMovConcepto] = useState('');
  const [movReferencia, setMovReferencia] = useState('');

  const [saving, setSaving] = useState(false);

  const cajasAbiertas = useMemo(() => cajas.filter((caja) => (caja.estado || '').toUpperCase() === 'ABIERTA'), [cajas]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cajasResult, movimientosResult] = await Promise.allSettled([
        reportesService.listCajas(),
        reportesService.listMovimientosCaja(),
      ]);

      const cajasData = cajasResult.status === 'fulfilled' ? cajasResult.value : [];
      const movimientosData = movimientosResult.status === 'fulfilled' ? movimientosResult.value : [];

      if (cajasResult.status === 'rejected') {
        const reason = cajasResult.reason;
        if (reason instanceof ApiHttpError && reason.status === 403 && isLicenseErrorData(reason.data)) {
          throw reason;
        }
      }

      setCajas(cajasData);
      setMovimientos(movimientosData);
      if (cajasData.length > 0 && !movCajaId) {
        setMovCajaId(String(cajasData[0].id));
      }
      if (movimientosResult.status === 'rejected') {
        setError('No tienes permisos para consultar movimientos de caja, pero sí para ver las cajas.');
      }
    } catch (err) {
      if (err instanceof ApiHttpError && err.status === 403 && isLicenseErrorData(err.data)) {
        setError(licenseErrorMessage(String(err.data?.status ?? '')));
      } else {
      setError('No se pudo cargar el módulo de caja.');
      }
    } finally {
      setLoading(false);
    }
  }, [movCajaId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCaja = async () => {
    if (!user?.sucursal_id) {
      setError('El usuario no tiene sucursal asignada para abrir caja.');
      return;
    }
    const monto = Number(montoInicial);
    if (!Number.isFinite(monto) || monto < 0) {
      setError('Ingresa un monto inicial válido.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await reportesService.createCaja({
        empresa: user.empresa_id,
        sucursal: user.sucursal_id,
        usuario: user.id,
        monto_inicial: monto,
        estado: 'ABIERTA',
      });
      setCajas((prev) => [created, ...prev]);
      setMontoInicial('0');
      if (!movCajaId) setMovCajaId(String(created.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la caja.');
    } finally {
      setSaving(false);
    }
  };

  const closeCaja = async () => {
    const cajaId = Number(cerrarCajaId);
    const cierre = Number(montoCierre);
    if (!cajaId) {
      setError('Selecciona una caja abierta para cerrar.');
      return;
    }
    if (!Number.isFinite(cierre) || cierre < 0) {
      setError('Ingresa un monto de cierre válido.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await reportesService.updateCaja(cajaId, {
        estado: 'CERRADA',
        monto_cierre: cierre,
      });
      setCajas((prev) => prev.map((caja) => (caja.id === updated.id ? updated : caja)));
      setCerrarCajaId('');
      setMontoCierre('0');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la caja.');
    } finally {
      setSaving(false);
    }
  };

  const createMovimiento = async () => {
    const caja = Number(movCajaId);
    const monto = Number(movMonto);
    if (!caja) {
      setError('Selecciona la caja del movimiento.');
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      setError('Ingresa un monto válido para el movimiento.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await reportesService.createMovimientoCaja({
        caja,
        tipo: movTipo,
        concepto: movConcepto.trim() || undefined,
        referencia: movReferencia.trim() || undefined,
        monto,
      });
      setMovimientos((prev) => [created, ...prev]);
      setMovMonto('0');
      setMovConcepto('');
      setMovReferencia('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el movimiento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="upage">
      <div className="upage__header">
        <div>
          <h2 className="upage__title">Movimiento de Caja</h2>
          <p className="upage__subtitle">Apertura, cierre y registro de ingresos/egresos con fecha automática</p>
        </div>
      </div>

      {error && <div className="table-empty" style={{ color: '#f87171' }}>{error}</div>}
      {loading && <div className="table-empty">Cargando datos de caja…</div>}

      {!loading && (
        <>
          <section className="cash-grid">
            <article className="cash-card">
              <h3>Abrir caja</h3>
              <div className="m-field">
                <label className="m-field__label">Monto inicial</label>
                <input className="m-field__input" type="number" value={montoInicial} onChange={(event) => setMontoInicial(event.target.value)} />
              </div>
              <button className="btn-primary" type="button" disabled={saving} onClick={openCaja}>
                <Plus size={14} /> Abrir caja ahora
              </button>
            </article>

            <article className="cash-card">
              <h3>Cerrar caja</h3>
              <div className="m-field">
                <label className="m-field__label">Caja abierta</label>
                <select className="m-field__select" value={cerrarCajaId} onChange={(event) => setCerrarCajaId(event.target.value)}>
                  <option value="">Seleccionar...</option>
                  {cajasAbiertas.map((caja) => (
                    <option key={caja.id} value={caja.id}>Caja #{caja.id} · Apertura {fmtDateTime(caja.fecha_apertura)}</option>
                  ))}
                </select>
              </div>
              <div className="m-field">
                <label className="m-field__label">Monto cierre</label>
                <input className="m-field__input" type="number" value={montoCierre} onChange={(event) => setMontoCierre(event.target.value)} />
              </div>
              <button className="btn-primary" type="button" disabled={saving} onClick={closeCaja}>
                <RotateCcw size={14} /> Cerrar caja
              </button>
            </article>

            <article className="cash-card">
              <h3>Registrar movimiento</h3>
              <div className="m-field">
                <label className="m-field__label">Caja</label>
                <select className="m-field__select" value={movCajaId} onChange={(event) => setMovCajaId(event.target.value)}>
                  <option value="">Seleccionar...</option>
                  {cajas.map((caja) => (
                    <option key={caja.id} value={caja.id}>Caja #{caja.id} · {caja.estado}</option>
                  ))}
                </select>
              </div>
              <div className="modal-row">
                <div className="m-field">
                  <label className="m-field__label">Tipo</label>
                  <select className="m-field__select" value={movTipo} onChange={(event) => setMovTipo(event.target.value)}>
                    <option value="INGRESO">Ingreso</option>
                    <option value="EGRESO">Egreso</option>
                  </select>
                </div>
                <div className="m-field">
                  <label className="m-field__label">Monto</label>
                  <input className="m-field__input" type="number" value={movMonto} onChange={(event) => setMovMonto(event.target.value)} />
                </div>
              </div>
              <div className="m-field">
                <label className="m-field__label">Concepto</label>
                <input className="m-field__input" value={movConcepto} onChange={(event) => setMovConcepto(event.target.value)} />
              </div>
              <div className="m-field">
                <label className="m-field__label">Referencia</label>
                <input className="m-field__input" value={movReferencia} onChange={(event) => setMovReferencia(event.target.value)} />
              </div>
              <button className="btn-primary" type="button" disabled={saving} onClick={createMovimiento}>Guardar movimiento</button>
            </article>
          </section>

          <section className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Caja</th>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th>Referencia</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.length === 0 ? (
                  <tr><td className="table-empty" colSpan={6}>No hay movimientos de caja.</td></tr>
                ) : movimientos.map((movimiento) => (
                  <tr key={movimiento.id}>
                    <td>#{movimiento.caja}</td>
                    <td><span className={`badge badge--${movimiento.tipo === 'INGRESO' ? 'active' : 'warn'}`}>{movimiento.tipo}</span></td>
                    <td>{movimiento.concepto || '—'}</td>
                    <td>{movimiento.referencia || '—'}</td>
                    <td className="td-num" style={{ color: movimiento.tipo === 'INGRESO' ? '#4ade80' : '#fbbf24' }}>{fmtMoney(movimiento.monto)}</td>
                    <td className="td-mono">{fmtDateTime(movimiento.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="table-wrap" style={{ marginTop: 14 }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Caja</th>
                  <th>Apertura</th>
                  <th>Monto inicial</th>
                  <th>Cierre</th>
                  <th>Monto cierre</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {cajas.length === 0 ? (
                  <tr><td className="table-empty" colSpan={6}>No hay cajas registradas.</td></tr>
                ) : cajas.map((caja) => (
                  <tr key={caja.id}>
                    <td>#{caja.id}</td>
                    <td className="td-mono">{fmtDateTime(caja.fecha_apertura)}</td>
                    <td className="td-num">{fmtMoney(caja.monto_inicial)}</td>
                    <td className="td-mono">{fmtDateTime(caja.fecha_cierre)}</td>
                    <td className="td-num">{caja.monto_cierre != null ? fmtMoney(caja.monto_cierre) : '—'}</td>
                    <td><span className={`badge badge--${caja.estado === 'ABIERTA' ? 'active' : 'inactive'}`}>{caja.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
