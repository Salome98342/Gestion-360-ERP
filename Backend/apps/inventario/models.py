from decimal import Decimal
from django.db import models
from django.utils import timezone

from apps.empresas.models import Empresa
from apps.usuarios.models import Usuario, Sucursal as UsuarioSucursal


class Categoria(models.Model):
    class Meta:
        db_table = "categoria"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='categorias')
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(null=True, blank=True)
    activa = models.IntegerField(default=1)

    def __str__(self):
        return f'{self.nombre} ({self.empresa_id})'


class TipoCliente(models.Model):
    class Meta:
        db_table = "tipo_cliente"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='tipos_clientes')
    nombre = models.CharField(max_length=255)
    limite_credito = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    dias_credito = models.IntegerField(default=0)
    descuento_por_defecto = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    def __str__(self):
        return f'{self.nombre} ({self.empresa_id})'


class Cliente(models.Model):
    class Meta:
        db_table = "cliente"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='clientes')
    nombre = models.CharField(max_length=255)
    telefono = models.CharField(max_length=50, null=True, blank=True)
    tipo_cliente = models.ForeignKey(TipoCliente, null=True, blank=True, on_delete=models.SET_NULL)
    saldo_actual = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    activo = models.IntegerField(default=1)

    def __str__(self):
        return f'{self.nombre} ({self.empresa_id})'


class Proveedor(models.Model):
    class Meta:
        db_table = "proveedor"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='proveedores')
    nombre = models.CharField(max_length=255)
    nit = models.CharField(max_length=50, null=True, blank=True)
    telefono = models.CharField(max_length=50, null=True, blank=True)
    direccion = models.TextField(null=True, blank=True)
    activo = models.IntegerField(default=1)

    def __str__(self):
        return f'{self.nombre} ({self.empresa_id})'


class Producto(models.Model):
    class Meta:
        db_table = "producto"
        constraints = [
            models.UniqueConstraint(fields=['nombre', 'sucursal'], name='unique_producto_nombre_sucursal')
        ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='productos')
    categoria = models.ForeignKey(Categoria, null=True, blank=True, on_delete=models.SET_NULL)
    nombre = models.CharField(max_length=255)
    precio_compra = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    precio_venta = models.DecimalField(max_digits=12, decimal_places=2)
    costo_promedio = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    margen_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    stock_actual = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    sucursal = models.ForeignKey(UsuarioSucursal, on_delete=models.CASCADE, related_name='productos')
    proveedor = models.ForeignKey(Proveedor, null=True, blank=True, on_delete=models.SET_NULL)
    activo = models.IntegerField(default=1)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre


class Caja(models.Model):
    class EstadoCaja(models.TextChoices):
        ABIERTA = 'ABIERTA', 'Abierta'
        CERRADA = 'CERRADA', 'Cerrada'

    class Meta:
        db_table = "caja"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='cajas')
    sucursal = models.ForeignKey(UsuarioSucursal, on_delete=models.CASCADE, related_name='cajas')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='cajas')

    fecha_apertura = models.DateTimeField(default=timezone.now)
    monto_inicial = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    monto_cierre = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    estado = models.CharField(
        max_length=20, 
        choices=EstadoCaja.choices, 
        default=EstadoCaja.ABIERTA
    )

    def __str__(self):
        return f'Caja #{self.id} ({self.empresa_id}) - {self.get_estado_display()}'

    def calcular_y_cerrar(self, monto_cierre_manual=None):
        """Calcula el cierre de caja basado en movimientos, o usa un monto manual."""
        if self.estado == self.EstadoCaja.CERRADA:
            return

        self.fecha_cierre = timezone.now()
        
        if monto_cierre_manual is not None:
            self.monto_cierre = monto_cierre_manual
        else:
            # Requiere que exista el related_name 'movimientos' apuntando a esta caja
            ingresos = sum((m.monto for m in self.movimientos.filter(tipo__iexact='INGRESO')), Decimal('0.00'))
            egresos = sum((m.monto for m in self.movimientos.filter(tipo__iexact='EGRESO')), Decimal('0.00'))
            self.monto_cierre = (self.monto_inicial or Decimal('0.00')) + ingresos - egresos
            
        self.estado = self.EstadoCaja.CERRADA
        self.save(update_fields=['fecha_cierre', 'monto_cierre', 'estado'])