from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend

from apps.mixins import EmpresaScopedViewSetMixin
from apps.usuarios.permissions import RolPermission
from apps.empresas.permissions import LicenciaPermission

from .models import Categoria, TipoCliente, Cliente, Proveedor, Producto, Caja
from .serializers import (
    CategoriaSerializer,
    TipoClienteSerializer,
    ClienteSerializer,
    ProveedorSerializer,
    ProductoSerializer,
    ProductoReadSerializer,
    CajaSerializer,
)


class CategoriaViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo = 'inventario'
    permission_classes = [RolPermission, LicenciaPermission]
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer


class TipoClienteViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo = 'inventario'
    permission_classes = [RolPermission, LicenciaPermission]
    queryset = TipoCliente.objects.all()
    serializer_class = TipoClienteSerializer


class ClienteViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo = 'ventas'
    permission_classes = [RolPermission, LicenciaPermission]
    queryset = Cliente.objects.select_related('tipo_cliente').all()
    serializer_class = ClienteSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['activo', 'tipo_cliente']
    search_fields = ['nombre', 'telefono']


class ProveedorViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo = 'compras'
    permission_classes = [RolPermission, LicenciaPermission]
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['activo']
    search_fields = ['nombre', 'nit', 'telefono']


class ProductoViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo = 'inventario'
    permission_classes = [RolPermission, LicenciaPermission]
    queryset = Producto.objects.all()
    
    # Implementación limpia de filtros nativos
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['categoria', 'activo']
    search_fields = ['nombre']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ProductoSerializer
        return ProductoReadSerializer

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related('categoria', 'proveedor', 'sucursal')
            .order_by('nombre')
        )


class CajaViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo = 'caja'
    permission_classes = [RolPermission, LicenciaPermission]
    queryset = Caja.objects.all()
    serializer_class = CajaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estado', 'sucursal', 'usuario']

    def get_queryset(self):
        return super().get_queryset().select_related('sucursal', 'usuario').order_by('-id')