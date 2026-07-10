from decimal import Decimal
from django.db import models

from apps.empresas.models import Empresa
from apps.usuarios.models import Usuario
from apps.inventario.models import Proveedor, Producto, Cliente, Caja


class Compra(models.Model):
    class Meta:
        db_table = "compra"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='compras')
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, related_name='compras')
    sucursal = models.ForeignKey('usuarios.Sucursal', null=True, blank=True, on_delete=models.CASCADE, related_name='compras')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='compras')


    fecha = models.DateTimeField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    impuesto = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=12, decimal_places=2)
    estado = models.TextField()
    total_pagado = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    saldo_pendiente = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    def __str__(self):
        return f'Compra #{self.id}'


class ItemCompra(models.Model):
    class Meta:
        db_table = "item_compra"
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='items_compras')
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    costo_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)


class PagoProveedor(models.Model):
    class Meta:
        db_table = "pago_proveedor"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='pagos_proveedores')
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name='pagos')
    fecha = models.DateTimeField()
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    metodo_pago = models.TextField(null=True, blank=True)
    usuario = models.ForeignKey(Usuario, null=True, blank=True, on_delete=models.SET_NULL, related_name='pagos_proveedores')



class Venta(models.Model):
    class Meta:
        db_table = "venta"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='ventas')
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='ventas')
    sucursal = models.ForeignKey('usuarios.Sucursal', on_delete=models.CASCADE, related_name='ventas')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='ventas')

    cliente_nombre = models.TextField(null=True, blank=True)
    cliente_documento = models.TextField(null=True, blank=True)
    fecha = models.DateTimeField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    descuento_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    descuento_valor = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    subtotal_con_descuento = models.DecimalField(max_digits=12, decimal_places=2)
    porcentaje_impuesto = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    valor_impuesto = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=12, decimal_places=2)
    total_pagado = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    metodo_pago = models.TextField(default='EFECTIVO')
    monto_recibido = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    cambio = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    saldo_pendiente = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    estado = models.TextField()
    fecha_vencimiento = models.DateTimeField(null=True, blank=True)
    utilidad_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))


class ItemVenta(models.Model):
    class Meta:
        db_table = "item_venta"
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey(Producto, null=True, blank=True, on_delete=models.SET_NULL, related_name='items_ventas')
    descripcion = models.TextField(null=True, blank=True)
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    costo_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    utilidad = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tipo_pago = models.TextField(default='EFECTIVO')


class Abono(models.Model):
    class Meta:
        db_table = "abono"
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='abonos')
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='abonos')
    fecha = models.DateTimeField()
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    metodo_pago = models.TextField(null=True, blank=True)
    usuario = models.ForeignKey(Usuario, null=True, blank=True, on_delete=models.SET_NULL, related_name='abonos')


class Kardex(models.Model):
    class Meta:
        db_table = "kardex"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='kardex')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='kardex')
    sucursal = models.ForeignKey('usuarios.Sucursal', on_delete=models.CASCADE, related_name='kardex')
    tipo_movimiento = models.TextField()
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    costo_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    stock_anterior = models.DecimalField(max_digits=12, decimal_places=2)
    stock_resultante = models.DecimalField(max_digits=12, decimal_places=2)
    referencia = models.TextField(null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(Usuario, null=True, blank=True, on_delete=models.SET_NULL)


class MovimientoCaja(models.Model):
    class Meta:
        db_table = "movimiento_caja"
    caja = models.ForeignKey(Caja, on_delete=models.CASCADE, related_name='movimientos')
    tipo = models.TextField()
    concepto = models.TextField(null=True, blank=True)
    referencia = models.TextField(null=True, blank=True)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    fecha = models.DateTimeField()


class AuditoriaDescuento(models.Model):
    class Meta:
        db_table = "auditoria_descuento"
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='auditoria_descuentos')
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='auditoria_descuentos')
    descuento_anterior = models.DecimalField(max_digits=12, decimal_places=2)
    descuento_nuevo = models.DecimalField(max_digits=12, decimal_places=2)
    usuario_solicito = models.ForeignKey(Usuario, null=True, blank=True, on_delete=models.SET_NULL, related_name='auditoria_descuentos_solicito')
    usuario_autorizo = models.ForeignKey(Usuario, null=True, blank=True, on_delete=models.SET_NULL, related_name='auditoria_descuentos_autorizo')
    fecha = models.DateTimeField()
    motivo = models.TextField(null=True, blank=True)


class LogActividad(models.Model):
    class Meta:
        db_table = "log_actividad"
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='logs_actividad')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='logs_actividad')
    accion = models.TextField()
    descripcion = models.TextField(null=True, blank=True)
    modulo = models.TextField(null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)


class Secuencias(models.Model):
    class Meta:
        db_table = "secuencias"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='secuencias')
    tipo = models.TextField()
    ultimo_numero = models.IntegerField(default=0)

