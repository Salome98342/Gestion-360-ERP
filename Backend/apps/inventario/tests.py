from decimal import Decimal
from django.test import TestCase
from apps.inventario.serializers import ProductoSerializer
from apps.inventario.models import Caja

# NOTA: Para correr estas pruebas necesitas tener fábricas o fixtures 
# de Empresa y UsuarioSucursal que estén en las otras apps de tu proyecto.
# Aquí se ilustra la lógica principal.

class ProductoSerializerTest(TestCase):
    
    def test_calculo_precio_venta(self):
        """Prueba que el serializador calcula correctamente el precio de venta basado en el margen."""
        data = {
            'nombre': 'Producto de Prueba',
            'precio_compra': Decimal('100.00'),
            'margen_porcentaje': Decimal('25.00')
            # Faltaría inyectar sucursal y empresa dependiendo de tu setup
        }
        
        # Instanciamos el validador directo para aislar la regla de negocio
        serializer = ProductoSerializer()
        
        # Simulamos los datos que pasan por el validate()
        validated_data = serializer.validate(data)
        
        # 100 + 25% = 125
        self.assertEqual(validated_data['precio_venta'], Decimal('125.00'))

    def test_calculo_precio_venta_sin_margen(self):
        """Prueba que si no se envía margen, asume 0 y el precio de venta es igual al de compra."""
        data = {
            'nombre': 'Producto de Prueba 2',
            'precio_compra': Decimal('150.50'),
        }
        
        serializer = ProductoSerializer()
        validated_data = serializer.validate(data)
        
        self.assertEqual(validated_data['precio_venta'], Decimal('150.50'))


class CajaModelTest(TestCase):
    
    def test_cierre_caja_manual(self):
        """Prueba que el método calcular_y_cerrar cambia el estado y asigna la fecha."""
        # Se requiere instanciar una Empresa, Usuario y Sucursal para guardar la caja.
        # Simulamos la caja en memoria:
        caja = Caja(
            monto_inicial=Decimal('1000.00'),
            estado=Caja.EstadoCaja.ABIERTA
        )
        
        self.assertIsNone(caja.fecha_cierre)
        
        # Como no está guardada y no tiene relaciones reales, le pasamos un monto manual
        # para evitar que busque los .movimientos en la DB
        caja.calcular_y_cerrar(monto_cierre_manual=Decimal('1500.00'))
        
        self.assertEqual(caja.estado, Caja.EstadoCaja.CERRADA)
        self.assertIsNotNone(caja.fecha_cierre)
        self.assertEqual(caja.monto_cierre, Decimal('1500.00'))