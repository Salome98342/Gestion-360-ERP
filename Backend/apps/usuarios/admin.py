from django.contrib import admin

from .models import Sucursal, Rol, Usuario


@admin.register(Sucursal)
class SucursalAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "nombre", "telefono", "activa")
    search_fields = ("nombre", "telefono", "empresa__nombre")
    list_filter = ("activa", "empresa")
    autocomplete_fields = ("empresa",)


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "nombre")
    search_fields = ("nombre", "empresa__nombre")
    list_filter = ("empresa",)
    autocomplete_fields = ("empresa",)


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "sucursal", "rol", "username", "correo", "activo")
    search_fields = ("username", "correo", "cedula", "empresa__nombre", "rol__nombre", "sucursal__nombre")
    list_filter = ("activo", "empresa", "rol", "sucursal")
    autocomplete_fields = ("empresa", "sucursal", "rol")