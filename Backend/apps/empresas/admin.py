from django.contrib import admin
from django.conf import settings
from django.db import connection

from .models import Empresa, LicenciaToken, RenovacionLicencia


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "nit", "moneda", "activa")
    search_fields = ("nombre", "nit")
    list_filter = ("activa", "moneda")

    def changelist_view(self, request, extra_context=None):
        # Diagnóstico visible en UI para confirmar contra qué DB/schema está consultando admin.
        extra_context = extra_context or {}
        try:
            dsn = connection.get_dsn_parameters()
            extra_context["_debug_db_dsn"] = dsn
            extra_context["_debug_db_settings"] = settings.DATABASES.get("default", {})
            extra_context["_debug_empresa_count"] = Empresa.objects.count()
        except Exception as e:
            extra_context["_debug_db_error"] = str(e)

        return super().changelist_view(request, extra_context=extra_context)




@admin.register(LicenciaToken)
class LicenciaTokenAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "token", "estado", "fecha_activacion", "fecha_vencimiento")
    search_fields = ("token", "empresa__nombre")
    list_filter = ("estado", "empresa")
    autocomplete_fields = ("empresa",)


@admin.register(RenovacionLicencia)
class RenovacionLicenciaAdmin(admin.ModelAdmin):
    list_display = ("id", "licencia", "fecha_renovacion", "meses_agregados", "nueva_fecha_vencimiento", "monto_pagado")
    search_fields = ("licencia__token", "licencia__empresa__nombre")
    list_filter = ("meses_agregados",)
    autocomplete_fields = ("licencia",)

