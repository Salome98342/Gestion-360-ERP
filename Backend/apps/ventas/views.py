from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.usuarios.permissions import RolPermission
from .models import (
    Compra,
    ItemCompra,
    PagoProveedor,
    Venta,
    ItemVenta,
    Abono,
    Kardex,
    MovimientoCaja,
    AuditoriaDescuento,
    LogActividad,
    Secuencias,
)
from .serializers import (
    CompraSerializer,
    CompraReadSerializer,
    ItemCompraSerializer,
    PagoProveedorSerializer,
    VentaSerializer,
    VentaWriteSerializer,
    VentaReadSerializer,
    ItemVentaSerializer,
    AbonoSerializer,
    KardexSerializer,
    MovimientoCajaSerializer,
    AuditoriaDescuentoSerializer,
    LogActividadSerializer,
    SecuenciasSerializer,
)


class CompraViewSet(viewsets.ReadOnlyModelViewSet):
    modulo             = 'compras'
    permission_classes = [RolPermission]
    serializer_class   = CompraReadSerializer

    def get_queryset(self):
        qs = Compra.objects.select_related('proveedor', 'usuario', 'sucursal').order_by('-fecha')
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado__iexact=estado)
        return qs


class ItemCompraViewSet(viewsets.ModelViewSet):
    modulo             = 'compras'
    permission_classes = [RolPermission]
    queryset = ItemCompra.objects.all()
    serializer_class = ItemCompraSerializer


class PagoProveedorViewSet(viewsets.ModelViewSet):
    modulo             = 'compras'
    permission_classes = [RolPermission]
    queryset = PagoProveedor.objects.all()
    serializer_class = PagoProveedorSerializer


class VentaViewSet(viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission]
    serializer_class   = VentaReadSerializer

    def get_queryset(self):
        qs = Venta.objects.select_related('cliente', 'usuario', 'sucursal').order_by('-fecha')
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado__iexact=estado)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return VentaWriteSerializer
        return VentaReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        venta = serializer.save()
        read_serializer = VentaReadSerializer(venta, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ItemVentaViewSet(viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission]
    queryset = ItemVenta.objects.all()
    serializer_class = ItemVentaSerializer


class AbonoViewSet(viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission]
    queryset = Abono.objects.all()
    serializer_class = AbonoSerializer


class KardexViewSet(viewsets.ModelViewSet):
    modulo             = 'inventario'
    permission_classes = [RolPermission]
    queryset = Kardex.objects.all()
    serializer_class = KardexSerializer


class MovimientoCajaViewSet(viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission]
    queryset = MovimientoCaja.objects.all()
    serializer_class = MovimientoCajaSerializer


class AuditoriaDescuentoViewSet(viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission]
    queryset = AuditoriaDescuento.objects.all()
    serializer_class = AuditoriaDescuentoSerializer


class LogActividadViewSet(viewsets.ReadOnlyModelViewSet):
    """Solo lectura. Filtra por ?usuario=id y/o ?modulo=nombre."""
    modulo             = 'usuarios'
    permission_classes = [RolPermission]
    serializer_class = LogActividadSerializer

    def get_queryset(self):
        qs = LogActividad.objects.select_related('usuario').order_by('-fecha')
        usuario_id = self.request.query_params.get('usuario')
        modulo     = self.request.query_params.get('modulo')
        if usuario_id:
            qs = qs.filter(usuario_id=usuario_id)
        if modulo:
            qs = qs.filter(modulo__iexact=modulo)
        return qs


class SecuenciasViewSet(viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission]
    queryset = Secuencias.objects.all()
    serializer_class = SecuenciasSerializer

