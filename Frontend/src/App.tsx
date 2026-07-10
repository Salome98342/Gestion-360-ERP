import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage      from './features/auth/LoginPage';
import MainLayout     from './layouts/MainLayout';
import DashboardPage  from './features/dashboard/DashboardPage';
import UsuariosPage   from './features/usuarios/UsuariosPage';
import InventarioPage from './features/inventario/InventarioPage';
import VentasPage     from './features/ventas/VentasPage';
import ComprasPage    from './features/compras/ComprasPage';
import EmpresasPage   from './features/empresas/EmpresasPage';
import ReportesPage   from './features/reportes/ReportesPage';
import MovimientosCajaPage from './features/caja/MovimientosCajaPage';
import { canView } from './utils/permissions';
import type { ModuleKey } from './types/usuarios';

/** Redirige al dashboard si el usuario no tiene acceso de lectura al módulo. */
function ModuleGuard({ module, children }: { module: ModuleKey; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!canView(user, module)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"  element={<DashboardPage />} />
            <Route path="/usuarios"   element={<ModuleGuard module="usuarios"><UsuariosPage /></ModuleGuard>} />
            <Route path="/inventario" element={<ModuleGuard module="inventario"><InventarioPage /></ModuleGuard>} />
            <Route path="/ventas"     element={<ModuleGuard module="ventas"><VentasPage /></ModuleGuard>} />
            <Route path="/compras"    element={<ModuleGuard module="compras"><ComprasPage /></ModuleGuard>} />
            <Route path="/empresas"   element={<ModuleGuard module="empresas"><EmpresasPage /></ModuleGuard>} />
            <Route path="/reportes"   element={<ModuleGuard module="reportes"><ReportesPage /></ModuleGuard>} />
            <Route path="/caja"       element={<ModuleGuard module="caja"><MovimientosCajaPage /></ModuleGuard>} />

          </Route>


          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
