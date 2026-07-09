"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.empresas.views import EmpresaViewSet, LicenciaTokenViewSet, RenovacionLicenciaViewSet, EventoEmpresaViewSet
from apps.usuarios.views import SucursalViewSet, RolViewSet, UsuarioViewSet, LoginView, RefreshView, LogoutView
from apps.inventario.views import (
    CategoriaViewSet,
    TipoClienteViewSet,
    ClienteViewSet,
    ProveedorViewSet,
    ProductoViewSet,
    CajaViewSet,
)
from apps.ventas.views import (
    CompraViewSet,
    PagoProveedorViewSet,
    VentaViewSet,
    AbonoViewSet,
    KardexViewSet,
    MovimientoCajaViewSet,
    AuditoriaDescuentoViewSet,
    LogActividadViewSet,
    SecuenciasViewSet,
)

router = DefaultRouter()

# Empresas
router.register(r'empresas', EmpresaViewSet)
router.register(r'licencias', LicenciaTokenViewSet)
router.register(r'renovaciones-licencia', RenovacionLicenciaViewSet)
router.register(r'eventos-empresa', EventoEmpresaViewSet, basename='evento-empresa')

# Usuarios / Estructura
router.register(r'sucursales', SucursalViewSet)
router.register(r'roles', RolViewSet)
router.register(r'usuarios', UsuarioViewSet)

# Inventario / Catálogos
router.register(r'categorias', CategoriaViewSet)
router.register(r'tipos-clientes', TipoClienteViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'proveedores', ProveedorViewSet)
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'cajas', CajaViewSet)

# Ventas / Compras / Movimientos
router.register(r'compras', CompraViewSet, basename='compra')
router.register(r'pagos-proveedores', PagoProveedorViewSet)
router.register(r'ventas', VentaViewSet, basename='venta')
router.register(r'abonos', AbonoViewSet)
router.register(r'kardex', KardexViewSet)
router.register(r'movimiento-caja', MovimientoCajaViewSet)
router.register(r'auditoria-descuento', AuditoriaDescuentoViewSet)
router.register(r'log-actividad', LogActividadViewSet, basename='log-actividad')
router.register(r'secuencias', SecuenciasViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include(router.urls)),
    path('auth/login/',   LoginView.as_view(),  name='auth-login'),
    path('auth/refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('auth/logout/',  LogoutView.as_view(),  name='auth-logout'),
]