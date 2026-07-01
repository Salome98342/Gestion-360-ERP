from django.contrib import admin

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

from django.db import connection


@admin.register(Compra)
class CompraAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "proveedor", "usuario", "fecha", "total", "estado")
    search_fields = ("proveedor__nombre", "empresa__nombre", "usuario__username", "estado")
    list_filter = ("estado", "empresa", "fecha")
    autocomplete_fields = ("empresa", "proveedor", "usuario")


@admin.register(ItemCompra)
class ItemCompraAdmin(admin.ModelAdmin):
    list_display = ("id", "compra", "producto", "cantidad", "costo_unitario", "subtotal")
    search_fields = ("compra__id", "producto__nombre")
    autocomplete_fields = ("compra", "producto")


@admin.register(PagoProveedor)
class PagoProveedorAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "compra", "fecha", "valor", "metodo_pago", "usuario")
    search_fields = ("compra__id", "empresa__nombre", "usuario__username")
    list_filter = ("metodo_pago", "empresa")
    autocomplete_fields = ("empresa", "compra", "usuario")


@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "empresa",
        "cliente",
        "usuario",
        "sucursal",
        "fecha",
        "total",
        "estado",
        "saldo_pendiente",
    )
    search_fields = ("cliente__nombre", "empresa__nombre", "usuario__username", "estado")
    list_filter = ("estado", "empresa", "fecha")
    autocomplete_fields = ("empresa", "cliente", "usuario", "sucursal")


@admin.register(ItemVenta)
class ItemVentaAdmin(admin.ModelAdmin):
    list_display = ("id", "venta", "producto", "cantidad", "precio_unitario", "subtotal", "tipo_pago")
    search_fields = ("venta__id", "producto__nombre")
    autocomplete_fields = ("venta", "producto")


@admin.register(Abono)
class AbonoAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "venta", "fecha", "valor", "metodo_pago", "usuario")
    search_fields = ("venta__id", "empresa__nombre", "usuario__username")
    list_filter = ("metodo_pago", "empresa")
    autocomplete_fields = ("empresa", "venta", "usuario")


@admin.register(Kardex)
class KardexAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "producto", "sucursal", "tipo_movimiento", "cantidad", "stock_resultante", "fecha", "usuario")
    search_fields = ("producto__nombre", "empresa__nombre", "referencia")
    list_filter = ("tipo_movimiento", "empresa", "fecha")
    autocomplete_fields = ("empresa", "producto", "sucursal", "usuario")


@admin.register(MovimientoCaja)
class MovimientoCajaAdmin(admin.ModelAdmin):
    list_display = ("id", "caja", "tipo", "monto", "fecha")
    search_fields = ("caja__id", "concepto", "referencia")
    list_filter = ("tipo",)
    autocomplete_fields = ("caja",)


@admin.register(AuditoriaDescuento)
class AuditoriaDescuentoAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "venta", "usuario_solicito", "usuario_autorizo", "fecha", "motivo")
    search_fields = ("venta__id", "empresa__nombre", "motivo")
    autocomplete_fields = ("empresa", "venta", "usuario_solicito", "usuario_autorizo")


@admin.register(LogActividad)
class LogActividadAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "usuario", "accion", "modulo", "fecha")
    search_fields = ("accion", "descripcion", "modulo", "empresa__nombre", "usuario__username")
    list_filter = ("modulo", "empresa", "fecha")
    autocomplete_fields = ("empresa", "usuario")


@admin.register(Secuencias)
class SecuenciasAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "tipo", "ultimo_numero")
    search_fields = ("empresa__nombre", "tipo")
    list_filter = ("empresa", "tipo")
    autocomplete_fields = ("empresa",)

