from rest_framework import serializers

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


class CompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Compra
        fields = '__all__'


class ItemCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemCompra
        fields = '__all__'


class PagoProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = PagoProveedor
        fields = '__all__'


class VentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venta
        fields = '__all__'


class ItemVentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemVenta
        fields = '__all__'


class AbonoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Abono
        fields = '__all__'


class KardexSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kardex
        fields = '__all__'


class MovimientoCajaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoCaja
        fields = '__all__'


class AuditoriaDescuentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditoriaDescuento
        fields = '__all__'


class LogActividadSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogActividad
        fields = '__all__'


class SecuenciasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Secuencias
        fields = '__all__'

