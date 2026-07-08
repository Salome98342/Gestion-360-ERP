from django.db import models

from apps.empresas.models import Empresa
from apps.usuarios.models import Usuario, Sucursal as UsuarioSucursal


class Categoria(models.Model):
    class Meta:
        db_table = "categoria"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='categorias')
    nombre = models.TextField()
    descripcion = models.TextField(null=True, blank=True)
    activa = models.IntegerField(default=1)

    def __str__(self):
        return f'{self.nombre} ({self.empresa_id})'


class TipoCliente(models.Model):
    class Meta:
        db_table = "tipo_cliente"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='tipos_clientes')
    nombre = models.TextField()
    limite_credito = models.FloatField(default=0)
    dias_credito = models.IntegerField(default=0)
    descuento_por_defecto = models.FloatField(default=0)

    def __str__(self):
        return f'{self.nombre} ({self.empresa_id})'


class Cliente(models.Model):
    class Meta:
        db_table = "cliente"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='clientes')
    nombre = models.TextField()
    telefono = models.TextField(null=True, blank=True)
    tipo_cliente = models.ForeignKey(TipoCliente, null=True, blank=True, on_delete=models.SET_NULL)
    saldo_actual = models.FloatField(default=0)
    activo = models.IntegerField(default=1)

    def __str__(self):
        return f'{self.nombre} ({self.empresa_id})'


class Proveedor(models.Model):
    class Meta:
        db_table = "proveedor"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='proveedores')
    nombre = models.TextField()
    nit = models.TextField(null=True, blank=True)
    telefono = models.TextField(null=True, blank=True)
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
    nombre = models.TextField()
    precio_compra = models.FloatField(default=0)
    precio_venta = models.FloatField()
    costo_promedio = models.FloatField(default=0)
    margen_porcentaje = models.FloatField(default=0)
    stock_actual = models.FloatField(default=0)
    sucursal = models.ForeignKey(UsuarioSucursal, on_delete=models.CASCADE, related_name='productos')
    proveedor = models.ForeignKey(Proveedor, null=True, blank=True, on_delete=models.SET_NULL)
    activo = models.IntegerField(default=1)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre


class Caja(models.Model):
    class Meta:
        db_table = "caja"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='cajas')
    sucursal = models.ForeignKey(UsuarioSucursal, on_delete=models.CASCADE, related_name='cajas')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='cajas')

    fecha_apertura = models.DateTimeField()
    monto_inicial = models.FloatField()
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    monto_cierre = models.FloatField(null=True, blank=True)
    estado = models.TextField()

    def __str__(self):
        return f'Caja #{self.id} ({self.empresa_id})'

