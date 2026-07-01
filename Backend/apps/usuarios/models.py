from django.db import models

from apps.empresas.models import Empresa


class Sucursal(models.Model):
    class Meta:
        db_table = "sucursal"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='sucursales')
    nombre = models.TextField()
    direccion = models.TextField(null=True, blank=True)
    telefono = models.TextField(null=True, blank=True)
    activa = models.IntegerField(default=1)

    def __str__(self):
        return f'{self.nombre} ({self.empresa_id})'


class Rol(models.Model):
    class Meta:
        db_table = "rol"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='roles')
    nombre = models.TextField()
    permisos = models.TextField(null=True, blank=True)

    def __str__(self):
        return f'{self.nombre} ({self.empresa_id})'


class Usuario(models.Model):
    class Meta:
        db_table = "usuario"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='usuario')
    sucursal = models.ForeignKey(Sucursal, null=True, blank=True, on_delete=models.SET_NULL, related_name='usuario')
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, related_name='usuario')

    nombre = models.TextField()
    cedula = models.TextField(null=True, blank=True)
    telefono = models.TextField(null=True, blank=True)
    correo = models.TextField(null=True, blank=True)
    username = models.TextField(unique=True)
    password = models.TextField()
    activo = models.IntegerField(default=1)

    def __str__(self):
        return self.username


