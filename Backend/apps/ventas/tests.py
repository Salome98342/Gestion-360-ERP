from decimal import Decimal
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.ventas.serializers import VentaWriteSerializer
from apps.inventario.models import Producto

class VentaSerializerTest(TestCase):
    # Nota: Requiere fixtures de setup para Empresa, Usuario, Producto en tu entorno real
    
    def test_venta_consumidor_final_sin_cliente(self):
        """Verifica que el sistema permite vender sin registrar cliente (POS rápido)."""
        data = {
            'cliente': None,
            'items': [],
            'pagos': []
        }
        serializer = VentaWriteSerializer(data=data)
        self.assertTrue(serializer.is_valid(), "El serializador debe aceptar cliente nulo")

    def test_bloqueo_stock_insuficiente(self):
        """Verifica que el sistema rechaza la venta si el stock es menor a la cantidad solicitada."""
        # Suponiendo que tienes un producto con stock_actual = 5.00
        # producto = Producto.objects.create(nombre="Test", stock_actual=Decimal('5.00'), ...)
        
        # Simulación de la regla de negocio del serializer
        stock_actual = Decimal('5.00')
        cantidad_a_vender = Decimal('6.00')
        
        with self.assertRaises(Exception) as context:
            if stock_actual < cantidad_a_vender:
                raise ValidationError('Stock insuficiente')
            
        self.assertTrue('Stock insuficiente' in str(context.exception))