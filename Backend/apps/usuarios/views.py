from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.mixins import EmpresaScopedViewSetMixin
from apps.empresas.permissions import LicenciaPermission, get_license_block_payload
from .models import Sucursal, Rol, Usuario
from .permissions import RolPermission
from .serializers import (
    SucursalSerializer, RolSerializer,
    UsuarioReadSerializer, UsuarioWriteSerializer,
)


# ── ViewSets CRUD ────────────────────────────────────────────────────────────

class SucursalViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'usuarios'
    permission_classes = [RolPermission, LicenciaPermission]
    queryset           = Sucursal.objects.all()
    serializer_class   = SucursalSerializer


class RolViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'usuarios'
    permission_classes = [RolPermission, LicenciaPermission]
    queryset           = Rol.objects.all()
    serializer_class   = RolSerializer


class UsuarioViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'usuarios'
    permission_classes = [RolPermission, LicenciaPermission]
    queryset           = Usuario.objects.select_related('rol', 'sucursal').all()

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return UsuarioWriteSerializer
        return UsuarioReadSerializer

    @action(detail=True, methods=['patch'], url_path='toggle-activo')
    def toggle_activo(self, request, pk=None):
        """Activa o desactiva el perfil del usuario."""
        usuario = self.get_object()
        usuario.activo = not usuario.activo # Ajustado a booleano
        usuario.save(update_fields=['activo'])
        estado = 'activo' if usuario.activo else 'inactivo'
        self.registrar_auditoria('update', usuario, extra_descripcion=f'Estado actualizado a {estado}.')
        return Response({'id': usuario.id, 'activo': usuario.activo})

    @action(detail=True, methods=['patch'], url_path='set-password')
    def set_password(self, request, pk=None):
        """Cambia la contraseña del usuario sin exponer otros datos."""
        password = request.data.get('password', '').strip()
        if not password or len(password) < 6:
            return Response(
                {'error': 'La contraseña debe tener al menos 6 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        usuario = self.get_object()
        usuario.set_password(password) # Usa el método nativo
        usuario.save(update_fields=['password'])
        self.registrar_auditoria('update', usuario, extra_descripcion='Se actualizo la contraseña del usuario.')
        return Response({'message': 'Contraseña actualizada correctamente.'})


# ── Helpers de autenticación ─────────────────────────────────────────────────

def _build_tokens(user: Usuario) -> RefreshToken:
    """Construye un RefreshToken con claims personalizados del usuario."""
    role_name = user.rol.nombre if user.rol else 'Platform Superuser'
    role_permissions = user.rol.permisos if user.rol else {'__admin__': True}

    refresh = RefreshToken()
    refresh['user_id']     = user.id
    refresh['username']    = user.username
    refresh['nombre']      = user.nombre
    refresh['is_staff']    = user.is_staff
    refresh['is_superuser'] = user.is_superuser
    refresh['rol_id']      = user.rol_id
    refresh['rol_nombre']  = role_name
    refresh['permisos']    = role_permissions or {'__admin__': True}
    refresh['empresa_id']  = user.empresa_id
    refresh['sucursal_id'] = user.sucursal_id
    return refresh


def _set_refresh_cookie(response: Response, token: str) -> None:
    """Establece el refresh token en cookie HttpOnly (inaccesible desde JS)."""
    response.set_cookie(
        key='refresh_token',
        value=token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
        max_age=60 * 60 * 24 * 7,
        path='/auth/',
    )


# ── Vistas de autenticación ──────────────────────────────────────────────────

class LoginView(APIView):
    """
    POST /auth/login/
    Body  : { "username": "...", "password": "..." }
    Return: { "access": "<jwt>", "user": { id, nombre, rol, ... } }
    Cookie: refresh_token (HttpOnly · SameSite=Strict · 7 días)
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response(
                {'error': 'Usuario y contraseña son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = (
                Usuario.objects
                .select_related('rol', 'empresa', 'sucursal')
                .get(username=username, activo=True) # Ajustado a booleano
            )
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Credenciales inválidas.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # No aceptamos credenciales almacenadas en texto plano.
        # Si existen registros legacy, deben corregirse mediante reset o migración controlada.
        stored = user.password or ''
        if stored and not stored.startswith(('pbkdf2_', 'bcrypt$', 'argon2')):
            return Response(
                {
                    'error': (
                        'La cuenta requiere un restablecimiento de contraseña por seguridad. '
                        'Contacta al administrador.'
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        password_ok = user.check_password(password)

        if not password_ok:
            return Response(
                {'error': 'Credenciales inválidas.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        license_block = None if user.is_superuser else get_license_block_payload(user.empresa_id)
        if license_block is not None:
            return Response(license_block, status=status.HTTP_403_FORBIDDEN)

        refresh = _build_tokens(user)
        access  = refresh.access_token
        role_name = user.rol.nombre if user.rol else 'Platform Superuser'
        role_permissions = user.rol.permisos if user.rol else {'__admin__': True}

        user_data = {
            'id':          user.id,
            'username':    user.username,
            'nombre':      user.nombre,
            'correo':      user.correo,
            'rol': {
                'id':       user.rol.id if user.rol else None,
                'nombre':   role_name,
                'permisos': role_permissions or {'__admin__': True},
            },
            'empresa_id':  user.empresa_id,
            'sucursal_id': user.sucursal_id,
            'is_staff':    user.is_staff,
            'is_superuser': user.is_superuser,
        }

        response = Response(
            {'access': str(access), 'user': user_data},
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, str(refresh))
        return response


class RefreshView(APIView):
    """
    POST /auth/refresh/
    Lee el cookie HttpOnly y devuelve un nuevo access token.
    Llamar al iniciar la app para restaurar sesión sin pedir login.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_refresh'

    def post(self, request):
        token = request.COOKIES.get('refresh_token')
        if not token:
            return Response(
                {'error': 'No hay sesión activa.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh    = RefreshToken(token)
            new_access = refresh.access_token
        except TokenError:
            return Response(
                {'error': 'Sesión expirada. Inicia sesión nuevamente.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        empresa_id = refresh.payload.get('empresa_id')
        license_block = None if refresh.payload.get('is_superuser') else get_license_block_payload(empresa_id)
        if license_block is not None:
            response = Response(license_block, status=status.HTTP_403_FORBIDDEN)
            response.delete_cookie('refresh_token', path='/auth/')
            return response

        response = Response({'access': str(new_access)}, status=status.HTTP_200_OK)
        _set_refresh_cookie(response, str(refresh))
        return response


class LogoutView(APIView):
    """
    POST /auth/logout/
    Invalida la cookie de sesión del cliente.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_logout'

    def post(self, request):
        response = Response(
            {'message': 'Sesión cerrada correctamente.'},
            status=status.HTTP_200_OK,
        )
        response.delete_cookie('refresh_token', path='/auth/')
        return response