from rest_framework import viewsets

from apps.usuarios.permissions import RolPermission
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


class CategoriaViewSet(viewsets.ModelViewSet):
    modulo             = 'inventario'
    permission_classes = [RolPermission]
    queryset           = Categoria.objects.all()
    serializer_class   = CategoriaSerializer


class TipoClienteViewSet(viewsets.ModelViewSet):
    modulo             = 'inventario'
    permission_classes = [RolPermission]
    queryset           = TipoCliente.objects.all()
    serializer_class   = TipoClienteSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission]
    queryset           = Cliente.objects.select_related('tipo_cliente').all()
    serializer_class   = ClienteSerializer


class ProveedorViewSet(viewsets.ModelViewSet):
    modulo             = 'compras'
    permission_classes = [RolPermission]
    queryset           = Proveedor.objects.all()
    serializer_class   = ProveedorSerializer


class ProductoViewSet(viewsets.ModelViewSet):
    modulo             = 'inventario'
    permission_classes = [RolPermission]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ProductoSerializer
        return ProductoReadSerializer

    def get_queryset(self):
        qs = Producto.objects.select_related('categoria', 'proveedor', 'sucursal').all()
        categoria = self.request.query_params.get('categoria')
        activo    = self.request.query_params.get('activo')
        search    = self.request.query_params.get('search')
        if categoria:
            qs = qs.filter(categoria_id=categoria)
        if activo is not None and activo != '':
            qs = qs.filter(activo=activo)
        if search:
            qs = qs.filter(nombre__icontains=search)
        return qs.order_by('nombre')


class CajaViewSet(viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission]
    queryset           = Caja.objects.all()
    serializer_class   = CajaSerializer

