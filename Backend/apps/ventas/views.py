from rest_framework import viewsets

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
    ItemCompraSerializer,
    PagoProveedorSerializer,
    VentaSerializer,
    ItemVentaSerializer,
    AbonoSerializer,
    KardexSerializer,
    MovimientoCajaSerializer,
    AuditoriaDescuentoSerializer,
    LogActividadSerializer,
    SecuenciasSerializer,
)


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.all()
    serializer_class = CompraSerializer


class ItemCompraViewSet(viewsets.ModelViewSet):
    queryset = ItemCompra.objects.all()
    serializer_class = ItemCompraSerializer


class PagoProveedorViewSet(viewsets.ModelViewSet):
    queryset = PagoProveedor.objects.all()
    serializer_class = PagoProveedorSerializer


class VentaViewSet(viewsets.ModelViewSet):
    queryset = Venta.objects.all()
    serializer_class = VentaSerializer


class ItemVentaViewSet(viewsets.ModelViewSet):
    queryset = ItemVenta.objects.all()
    serializer_class = ItemVentaSerializer


class AbonoViewSet(viewsets.ModelViewSet):
    queryset = Abono.objects.all()
    serializer_class = AbonoSerializer


class KardexViewSet(viewsets.ModelViewSet):
    queryset = Kardex.objects.all()
    serializer_class = KardexSerializer


class MovimientoCajaViewSet(viewsets.ModelViewSet):
    queryset = MovimientoCaja.objects.all()
    serializer_class = MovimientoCajaSerializer


class AuditoriaDescuentoViewSet(viewsets.ModelViewSet):
    queryset = AuditoriaDescuento.objects.all()
    serializer_class = AuditoriaDescuentoSerializer


class LogActividadViewSet(viewsets.ModelViewSet):
    queryset = LogActividad.objects.all()
    serializer_class = LogActividadSerializer


class SecuenciasViewSet(viewsets.ModelViewSet):
    queryset = Secuencias.objects.all()
    serializer_class = SecuenciasSerializer

