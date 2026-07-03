from django.db import models


class Empresa(models.Model):
    class Meta:
        db_table = "empresa"

    nombre = models.TextField()
    nit = models.TextField(null=True, blank=True)
    direccion = models.TextField(null=True, blank=True)
    telefono = models.TextField(null=True, blank=True)
    moneda = models.TextField(default='COP')
    porcentaje_impuesto = models.FloatField(default=0)
    activa = models.IntegerField(default=1)



class LicenciaToken(models.Model):
    class Meta:
        db_table = "licencia_token"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='licencias')
    token = models.TextField(unique=True)

    fecha_generacion = models.DateTimeField(auto_now_add=True)
    fecha_activacion = models.DateTimeField(null=True, blank=True)
    fecha_vencimiento = models.DateTimeField()
    estado = models.TextField(default='DISPONIBLE')

    def __str__(self):
        return f'{self.empresa_id} - {self.estado}'


class EventoEmpresa(models.Model):
    class Meta:
        db_table = "evento_empresa"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='eventos')
    titulo = models.TextField()
    descripcion = models.TextField(null=True, blank=True)
    fecha = models.DateTimeField()
    tipo = models.TextField(default='GENERAL')
    completado = models.IntegerField(default=0)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.titulo} ({self.empresa_id})'


class RenovacionLicencia(models.Model):
    class Meta:
        db_table = "renovacion_licencia"

    licencia = models.ForeignKey(LicenciaToken, on_delete=models.CASCADE, related_name='renovaciones')

    fecha_renovacion = models.DateTimeField(auto_now_add=True)
    meses_agregados = models.IntegerField()
    nueva_fecha_vencimiento = models.DateTimeField()
    monto_pagado = models.FloatField(default=0)
    observacion = models.TextField(null=True, blank=True)

    def __str__(self):
        return f'Renovación #{self.id} ({self.licencia_id})'

