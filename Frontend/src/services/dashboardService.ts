import { ventasService } from './ventasService';
import { inventarioService } from './inventarioService';
import { usuariosService } from './usuariosService';
import { reportesService } from './reportesService';
import { ApiHttpError, isLicenseErrorData } from '../utils/httpError';

function fromSettled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === 'fulfilled') return result.value;
  const reason = result.reason;
  if (reason instanceof ApiHttpError && reason.status === 403 && isLicenseErrorData(reason.data)) {
    throw reason;
  }
  return fallback;
}

export const dashboardService = {
  loadDashboard: async () => {
    const [ventasResult, comprasResult, productosResult, logsResult, eventosResult] = await Promise.allSettled([
      ventasService.listVentas(),
      ventasService.listCompras(),
      inventarioService.listProductos({ activo: 1 }),
      usuariosService.listLogs(),
      reportesService.listEventos(),
    ]);

    const ventas = fromSettled(ventasResult, []);
    const compras = fromSettled(comprasResult, []);
    const productos = fromSettled(productosResult, []);
    const logs = fromSettled(logsResult, []);
    const eventos = fromSettled(eventosResult, []);

    return { ventas, compras, productos, logs, eventos };
  },
};
