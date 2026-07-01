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


class ItemVentaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemVenta
        fields = [
            'producto',
            'descripcion',
            'cantidad',
            'precio_unitario',
            'costo_unitario',
            'subtotal',
            'utilidad',
            'tipo_pago',
        ]
        extra_kwargs = {
            'producto': {'required': False, 'allow_null': True},
            'descripcion': {'required': False, 'allow_blank': True, 'allow_null': True},
            'costo_unitario': {'required': False},
            'subtotal': {'read_only': True},
            'utilidad': {'read_only': True},
        }


class CompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Compra
        fields = '__all__'


class CompraReadSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    usuario_nombre   = serializers.CharField(source='usuario.nombre',   read_only=True)
    sucursal_nombre  = serializers.CharField(source='sucursal.nombre',  read_only=True, default=None)

    class Meta:
        model = Compra
        fields = [
            'id', 'empresa', 'proveedor', 'proveedor_nombre',
            'sucursal', 'sucursal_nombre', 'usuario', 'usuario_nombre',
            'fecha', 'subtotal', 'impuesto', 'total',
            'total_pagado', 'saldo_pendiente', 'estado',
        ]


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


class VentaWriteSerializer(serializers.ModelSerializer):
    items = ItemVentaWriteSerializer(many=True)

    class Meta:
        model = Venta
        fields = [
            'id', 'empresa', 'cliente', 'sucursal', 'usuario',
            'fecha', 'subtotal', 'descuento_porcentaje', 'descuento_valor',
            'subtotal_con_descuento', 'porcentaje_impuesto', 'valor_impuesto',
            'total', 'total_pagado', 'saldo_pendiente', 'estado',
            'fecha_vencimiento', 'utilidad_total', 'items',
        ]
        extra_kwargs = {
            'subtotal': {'read_only': True},
            'descuento_valor': {'read_only': True},
            'subtotal_con_descuento': {'read_only': True},
            'valor_impuesto': {'read_only': True},
            'total': {'read_only': True},
            'saldo_pendiente': {'read_only': True},
            'utilidad_total': {'read_only': True},
        }

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('Debes agregar al menos un item a la venta.')
        for item in items:
            cantidad = item.get('cantidad') or 0
            precio_unitario = item.get('precio_unitario') or 0
            if cantidad <= 0:
                raise serializers.ValidationError('La cantidad de cada item debe ser mayor que cero.')
            if precio_unitario < 0:
                raise serializers.ValidationError('El precio unitario no puede ser negativo.')
        return items

    def create(self, validated_data):
        items_data = validated_data.pop('items')

        subtotal = 0.0
        utilidad_total = 0.0
        for item in items_data:
            cantidad = float(item['cantidad'])
            precio_unitario = float(item['precio_unitario'])
            costo_unitario = float(item.get('costo_unitario') or 0)
            subtotal += cantidad * precio_unitario
            utilidad_total += cantidad * (precio_unitario - costo_unitario)

        descuento_porcentaje = float(validated_data.get('descuento_porcentaje') or 0)
        descuento_valor = subtotal * descuento_porcentaje / 100
        subtotal_con_descuento = subtotal - descuento_valor

        porcentaje_impuesto = float(validated_data.get('porcentaje_impuesto') or 0)
        valor_impuesto = subtotal_con_descuento * porcentaje_impuesto / 100
        total = subtotal_con_descuento + valor_impuesto

        total_pagado = float(validated_data.get('total_pagado') or 0)
        saldo_pendiente = total - total_pagado

        validated_data['subtotal'] = subtotal
        validated_data['descuento_valor'] = descuento_valor
        validated_data['subtotal_con_descuento'] = subtotal_con_descuento
        validated_data['valor_impuesto'] = valor_impuesto
        validated_data['total'] = total
        validated_data['saldo_pendiente'] = saldo_pendiente
        validated_data['utilidad_total'] = utilidad_total

        venta = Venta.objects.create(**validated_data)

        for item in items_data:
            cantidad = float(item['cantidad'])
            precio_unitario = float(item['precio_unitario'])
            costo_unitario = float(item.get('costo_unitario') or 0)
            ItemVenta.objects.create(
                venta=venta,
                producto=item.get('producto'),
                descripcion=item.get('descripcion') or '',
                cantidad=cantidad,
                precio_unitario=precio_unitario,
                costo_unitario=costo_unitario,
                subtotal=cantidad * precio_unitario,
                utilidad=cantidad * (precio_unitario - costo_unitario),
                tipo_pago=item.get('tipo_pago') or 'EFECTIVO',
            )

        return venta


class VentaReadSerializer(serializers.ModelSerializer):
    cliente_nombre  = serializers.CharField(source='cliente.nombre',  read_only=True)
    usuario_nombre  = serializers.CharField(source='usuario.nombre',  read_only=True)
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)

    class Meta:
        model = Venta
        fields = [
            'id', 'empresa', 'cliente', 'cliente_nombre',
            'sucursal', 'sucursal_nombre', 'usuario', 'usuario_nombre',
            'fecha', 'fecha_vencimiento', 'subtotal', 'descuento_valor', 'total',
            'total_pagado', 'saldo_pendiente', 'estado', 'utilidad_total',
        ]


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
    usuario_nombre   = serializers.CharField(source='usuario.nombre',   read_only=True)
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = LogActividad
        fields = [
            'id', 'empresa', 'usuario', 'usuario_nombre', 'usuario_username',
            'accion', 'descripcion', 'modulo', 'fecha',
        ]


class SecuenciasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Secuencias
        fields = '__all__'

