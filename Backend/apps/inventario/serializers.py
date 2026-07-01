from rest_framework import serializers

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


class TipoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCliente
        fields = '__all__'


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = '__all__'


class ProductoReadSerializer(serializers.ModelSerializer):
    """GET: incluye nombres legibles de categoria, proveedor y sucursal."""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True, default=None)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True, default=None)
    sucursal_nombre  = serializers.CharField(source='sucursal.nombre',  read_only=True)

    class Meta:
        model = Producto
        fields = [
            'id', 'empresa', 'categoria', 'categoria_nombre',
            'nombre', 'precio_venta', 'costo_promedio', 'margen_porcentaje',
            'stock_actual', 'sucursal', 'sucursal_nombre',
            'proveedor', 'proveedor_nombre', 'activo',
        ]


class CajaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caja
        fields = '__all__'

