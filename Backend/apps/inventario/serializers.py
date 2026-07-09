from rest_framework import serializers
from decimal import Decimal
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
        read_only_fields = ['empresa', 'precio_venta']

    def validate(self, attrs):
        empresa_id = self.context.get('empresa_id')
        for field in ('categoria', 'proveedor', 'sucursal'):
            value = attrs.get(field)
            if value and empresa_id and value.empresa_id != empresa_id:
                raise serializers.ValidationError({field: 'No pertenece a tu empresa.'})

        precio_compra = attrs.get('precio_compra')
        margen_porcentaje = attrs.get('margen_porcentaje', Decimal('0.00'))

        if precio_compra is None:
            raise serializers.ValidationError({'precio_compra': 'Este campo es obligatorio.'})
        if precio_compra <= Decimal('0.00'):
            raise serializers.ValidationError({'precio_compra': 'Debe ser mayor a 0.'})
        if margen_porcentaje < Decimal('0.00'):
            raise serializers.ValidationError({'margen_porcentaje': 'No puede ser negativo.'})

        # Recalcular SIEMPRE precio_venta usando Decimal para precisión financiera
        precio_compra_dec = Decimal(str(precio_compra))
        margen_dec = Decimal(str(margen_porcentaje))
        factor = Decimal('1.00') + (margen_dec / Decimal('100.00'))
        
        attrs['precio_venta'] = round(precio_compra_dec * factor, 2)

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
        read_only_fields = ['empresa', 'fecha_apertura', 'fecha_cierre', 'monto_cierre']

    def validate(self, attrs):
        empresa_id = self.context.get('empresa_id')
        
        for field in ('sucursal', 'usuario'):
            value = attrs.get(field)
            if value and empresa_id and value.empresa_id != empresa_id:
                raise serializers.ValidationError({field: 'No pertenece a tu empresa.'})
                
        estado_entrante = attrs.get('estado', getattr(self.instance, 'estado', Caja.EstadoCaja.ABIERTA))

        # Validación de creación de caja nueva
        if self.instance is None and estado_entrante == Caja.EstadoCaja.ABIERTA:
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
                estado=Caja.EstadoCaja.ABIERTA,
            ).exists():
                raise serializers.ValidationError('Ya existe una caja abierta para este usuario y sucursal.')
                
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and getattr(request, 'user', None):
            validated_data.setdefault('usuario', request.user)
            validated_data.setdefault('sucursal', request.user.sucursal)
            
        validated_data['fecha_apertura'] = timezone.now()
        validated_data['estado'] = Caja.EstadoCaja.ABIERTA
        return super().create(validated_data)

    def update(self, instance, validated_data):
        nuevo_estado = validated_data.get('estado')
        
        # Si se solicita cerrar la caja y actualmente está abierta
        if nuevo_estado == Caja.EstadoCaja.CERRADA and instance.estado == Caja.EstadoCaja.ABIERTA:
            monto_manual = validated_data.get('monto_cierre')
            # Usamos el método delegado en el modelo
            instance.calcular_y_cerrar(monto_cierre_manual=monto_manual)
            # Quitamos estado y monto de validated_data para que super().update no los sobreescriba erróneamente
            validated_data.pop('estado', None)
            validated_data.pop('monto_cierre', None)

        return super().update(instance, validated_data)