from rest_framework import serializers
from django.utils import timezone

from .models import (
    Categoria,
    TipoCliente,
    Cliente,
    Proveedor,
    Producto,
    Caja,
)


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'
        read_only_fields = ['empresa']


class TipoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCliente
        fields = '__all__'
        read_only_fields = ['empresa']


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'
        read_only_fields = ['empresa']

    def validate_tipo_cliente(self, value):
        empresa_id = self.context.get('empresa_id')
        if value and empresa_id and value.empresa_id != empresa_id:
            raise serializers.ValidationError('El tipo de cliente no pertenece a tu empresa.')
        return value


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'
        read_only_fields = ['empresa']


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = '__all__'
        read_only_fields = ['empresa']

    def validate(self, attrs):
        empresa_id = self.context.get('empresa_id')
        for field in ('categoria', 'proveedor', 'sucursal'):
            value = attrs.get(field)
            if value and empresa_id and value.empresa_id != empresa_id:
                raise serializers.ValidationError({field: 'No pertenece a tu empresa.'})

        precio_compra = attrs.get('precio_compra')
        margen_porcentaje = attrs.get('margen_porcentaje')

        if precio_compra is None:
            raise serializers.ValidationError({'precio_compra': 'Este campo es obligatorio.'})
        if precio_compra <= 0:
            raise serializers.ValidationError({'precio_compra': 'Debe ser mayor a 0.'})

        if margen_porcentaje is None:
            margen_porcentaje = 0
            attrs['margen_porcentaje'] = margen_porcentaje
        if margen_porcentaje < 0:
            raise serializers.ValidationError({'margen_porcentaje': 'No puede ser negativo.'})

        # Recalcular SIEMPRE precio_venta desde precio_compra y margen
        attrs['precio_venta'] = float(precio_compra) * (1 + float(margen_porcentaje) / 100.0)

        return attrs


class ProductoReadSerializer(serializers.ModelSerializer):
    """GET: incluye nombres legibles de categoria, proveedor y sucursal."""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True, default=None)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True, default=None)
    sucursal_nombre  = serializers.CharField(source='sucursal.nombre', read_only=True)

    class Meta:
        model = Producto
        fields = [
            'id', 'empresa', 'categoria', 'categoria_nombre',
            'nombre', 'precio_compra', 'precio_venta', 'costo_promedio', 'margen_porcentaje',
            'stock_actual', 'sucursal', 'sucursal_nombre',
            'proveedor', 'proveedor_nombre', 'activo',
        ]


class CajaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caja
        fields = '__all__'
        read_only_fields = ['empresa', 'fecha_apertura', 'fecha_cierre']

    def validate(self, attrs):
        empresa_id = self.context.get('empresa_id')
        for field in ('sucursal', 'usuario'):
            value = attrs.get(field)
            if value and empresa_id and value.empresa_id != empresa_id:
                raise serializers.ValidationError({field: 'No pertenece a tu empresa.'})
        estado = (attrs.get('estado') or getattr(self.instance, 'estado', '') or '').upper()
        if self.instance is None and estado == 'ABIERTA':
            usuario = attrs.get('usuario')
            sucursal = attrs.get('sucursal')
            request = self.context.get('request')
            if request and getattr(request, 'user', None):
                usuario = usuario or request.user
                sucursal = sucursal or request.user.sucursal
            if usuario and sucursal and Caja.objects.filter(
                empresa_id=empresa_id,
                usuario=usuario,
                sucursal=sucursal,
                estado__iexact='ABIERTA',
            ).exists():
                raise serializers.ValidationError('Ya existe una caja abierta para este usuario y sucursal.')
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and getattr(request, 'user', None):
            validated_data.setdefault('usuario', request.user)
            validated_data.setdefault('sucursal', request.user.sucursal)
        validated_data['fecha_apertura'] = timezone.now()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if (validated_data.get('estado') or instance.estado or '').upper() == 'CERRADA' and not instance.fecha_cierre:
            validated_data['fecha_cierre'] = timezone.now()
            if validated_data.get('monto_cierre') is None:
                ingresos = sum(m.monto for m in instance.movimientos.filter(tipo__iexact='INGRESO'))
                egresos = sum(m.monto for m in instance.movimientos.filter(tipo__iexact='EGRESO'))
                validated_data['monto_cierre'] = float(instance.monto_inicial or 0) + ingresos - egresos
        return super().update(instance, validated_data)
