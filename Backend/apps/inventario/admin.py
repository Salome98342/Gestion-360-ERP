from django.contrib import admin

from .models import Categoria, TipoCliente, Cliente, Proveedor, Producto, Caja


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "nombre", "activa")
    search_fields = ("nombre", "empresa__nombre")
    list_filter = ("activa", "empresa")
    autocomplete_fields = ("empresa",)


@admin.register(TipoCliente)
class TipoClienteAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "nombre", "limite_credito", "dias_credito")
    search_fields = ("nombre", "empresa__nombre")
    list_filter = ("empresa",)
    autocomplete_fields = ("empresa",)


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "nombre", "tipo_cliente", "saldo_actual", "activo")
    search_fields = ("nombre", "telefono", "empresa__nombre")
    list_filter = ("activo", "empresa", "tipo_cliente")
    autocomplete_fields = ("empresa", "tipo_cliente")


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "nombre", "nit", "telefono", "activo")
    search_fields = ("nombre", "nit", "telefono", "empresa__nombre")
    list_filter = ("activo", "empresa")
    autocomplete_fields = ("empresa",)


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "categoria", "nombre", "precio_venta", "stock_actual", "activo")
    search_fields = ("nombre", "empresa__nombre")
    list_filter = ("activo", "empresa", "categoria")
    autocomplete_fields = ("empresa", "categoria", "sucursal", "proveedor")


@admin.register(Caja)
class CajaAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "sucursal", "usuario", "estado")
    search_fields = ("estado", "empresa__nombre", "usuario__username", "sucursal__nombre")
    list_filter = ("empresa", "estado")
    autocomplete_fields = ("empresa", "sucursal", "usuario")

