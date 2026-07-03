import { ventasService } from './ventasService';
import { inventarioService } from './inventarioService';
import { usuariosService } from './usuariosService';
import { reportesService } from './reportesService';

export const dashboardService = {
  loadDashboard: async () => {
    const [ventas, compras, productos, logs, eventos] = await Promise.all([
      ventasService.listVentas(),
      ventasService.listCompras(),
      inventarioService.listProductos({ activo: 1 }),
      usuariosService.listLogs(),
      reportesService.listEventos(),
    ]);
    return { ventas, compras, productos, logs, eventos };
  },
};
