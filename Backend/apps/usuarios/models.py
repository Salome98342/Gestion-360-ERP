from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

from apps.empresas.models import Empresa


class Sucursal(models.Model):
    class Meta:
        db_table = "sucursal"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='sucursales')
    nombre = models.TextField()
    direccion = models.TextField(null=True, blank=True)
    telefono = models.TextField(null=True, blank=True)
    # Mejora: Usar BooleanField para datos lógicos
    activa = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.nombre} ({self.empresa_id})'


class Rol(models.Model):
    class Meta:
        db_table = "rol"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='roles')
    nombre = models.TextField()
    # Mejora: Delega la validación de estructura a la base de datos
    permisos = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f'{self.nombre} ({self.empresa_id})'


# Manager requerido al heredar de AbstractBaseUser
class UsuarioManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('El usuario debe tener un username')
        username = self.model.normalize_username(username)
        extra_fields.setdefault('nombre', username)
        extra_fields.setdefault('activo', True)
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)

        is_superuser = bool(extra_fields.get('is_superuser'))
        if not is_superuser:
            if extra_fields.get('empresa') is None:
                raise ValueError('Los usuarios del sistema deben pertenecer a una empresa.')
            if extra_fields.get('rol') is None:
                raise ValueError('Los usuarios del sistema deben tener un rol asignado.')

        user = self.model(username=username, **extra_fields)
        user.set_password(password) # Hashea la contraseña automáticamente
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('empresa', None)
        extra_fields.setdefault('rol', None)
        extra_fields.setdefault('sucursal', None)
        extra_fields.setdefault('nombre', username)
        extra_fields.setdefault('activo', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('El superusuario debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('El superusuario debe tener is_superuser=True.')
        if not password:
            raise ValueError('El superusuario debe tener una contraseña.')

        return self.create_user(username=username, password=password, **extra_fields)


class Usuario(AbstractBaseUser):
    class Meta:
        db_table = "usuario"

    empresa = models.ForeignKey(Empresa, null=True, blank=True, on_delete=models.CASCADE, related_name='usuario')
    sucursal = models.ForeignKey(Sucursal, null=True, blank=True, on_delete=models.SET_NULL, related_name='usuario')
    rol = models.ForeignKey(Rol, null=True, blank=True, on_delete=models.CASCADE, related_name='usuario')

    nombre = models.TextField()
    cedula = models.TextField(null=True, blank=True)
    telefono = models.TextField(null=True, blank=True)
    correo = models.TextField(null=True, blank=True)
    # CharField es más seguro y estándar para campos con índices únicos
    username = models.CharField(max_length=150, unique=True) 
    
    # El campo 'password' y 'last_login' ya los provee AbstractBaseUser por defecto.
    
    # Mejora: Usar BooleanField
    activo = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = 'username'
    # Campos obligatorios al crear desde consola (createsuperuser)
    REQUIRED_FIELDS = [] 

    @property
    def is_active(self):
        """Propiedad requerida por algunas librerías internas de Django"""
        return self.activo

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser

    @property
    def is_platform_admin(self):
        return self.is_superuser and self.empresa_id is None

    def __str__(self):
        return self.username