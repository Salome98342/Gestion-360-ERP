from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from .models import Sucursal, Rol, Usuario


class SucursalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sucursal
        fields = '__all__'
        read_only_fields = ['empresa']


class RolSerializer(serializers.ModelSerializer):
    """Incluye cantidad de usuarios activos asignados al rol."""
    usuarios_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Rol
        fields = ['id', 'empresa', 'nombre', 'permisos', 'usuarios_count']
        read_only_fields = ['empresa']

    def get_usuarios_count(self, obj):
        return obj.usuario.filter(activo=1).count()


class UsuarioReadSerializer(serializers.ModelSerializer):
    """GET: devuelve info del rol y sucursal anidada. El password NUNCA se expone."""
    rol_nombre      = serializers.CharField(source='rol.nombre',      read_only=True)
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True, default=None)

    class Meta:
        model = Usuario
        fields = [
            'id', 'empresa',
            'sucursal', 'sucursal_nombre',
            'rol',      'rol_nombre',
            'nombre', 'cedula', 'telefono', 'correo', 'username', 'activo',
        ]


class UsuarioWriteSerializer(serializers.ModelSerializer):
    """POST / PUT / PATCH: acepta password en texto plano y lo hashea con PBKDF2."""
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'empresa', 'sucursal', 'rol',
            'nombre', 'cedula', 'telefono', 'correo',
            'username', 'password', 'activo',
        ]
        read_only_fields = ['empresa']

    def validate_password(self, value: str) -> str:
        if value and len(value.strip()) < 6:
            raise serializers.ValidationError(
                'La contraseña debe tener al menos 6 caracteres.'
            )
        return value

    def create(self, validated_data):
        raw = validated_data.get('password', '').strip()
        if not raw:
            raise serializers.ValidationError(
                {'password': 'La contraseña es obligatoria al crear el usuario.'}
            )
        validated_data['password'] = make_password(raw)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        raw = validated_data.pop('password', None)
        if raw and raw.strip():
            validated_data['password'] = make_password(raw.strip())
        return super().update(instance, validated_data)

    def validate(self, attrs):
        empresa_id = self.context.get('empresa_id')
        for field in ('sucursal', 'rol'):
            value = attrs.get(field)
            if value and empresa_id and value.empresa_id != empresa_id:
                raise serializers.ValidationError({field: 'No pertenece a tu empresa.'})
        return attrs

