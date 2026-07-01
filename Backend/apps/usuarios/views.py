from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import Sucursal, Rol, Usuario
from .permissions import RolPermission
from .serializers import (
    SucursalSerializer, RolSerializer,
    UsuarioReadSerializer, UsuarioWriteSerializer,
)


# ── ViewSets CRUD ────────────────────────────────────────────────────────────

class SucursalViewSet(viewsets.ModelViewSet):
    modulo             = 'usuarios'
    permission_classes = [RolPermission]
    queryset           = Sucursal.objects.all()
    serializer_class   = SucursalSerializer


class RolViewSet(viewsets.ModelViewSet):
    modulo             = 'usuarios'
    permission_classes = [RolPermission]
    queryset           = Rol.objects.all()
    serializer_class   = RolSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    modulo             = 'usuarios'
    permission_classes = [RolPermission]
    queryset           = Usuario.objects.select_related('rol', 'sucursal').all()

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return UsuarioWriteSerializer
        return UsuarioReadSerializer

    @action(detail=True, methods=['patch'], url_path='toggle-activo')
    def toggle_activo(self, request, pk=None):
        """Activa o desactiva el perfil del usuario."""
        usuario = self.get_object()
        usuario.activo = 0 if usuario.activo else 1
        usuario.save(update_fields=['activo'])
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
        usuario.password = make_password(password)
        usuario.save(update_fields=['password'])
        return Response({'message': 'Contraseña actualizada correctamente.'})


# ── Helpers de autenticación ─────────────────────────────────────────────────

def _build_tokens(user: Usuario) -> RefreshToken:
    """Construye un RefreshToken con claims personalizados del usuario."""
    refresh = RefreshToken()
    refresh['user_id']     = user.id
    refresh['username']    = user.username
    refresh['nombre']      = user.nombre
    refresh['rol_id']      = user.rol_id
    refresh['rol_nombre']  = user.rol.nombre
    refresh['permisos']    = user.rol.permisos or ''
    refresh['empresa_id']  = user.empresa_id
    refresh['sucursal_id'] = user.sucursal_id
    return refresh


def _set_refresh_cookie(response: Response, token: str) -> None:
    """Establece el refresh token en cookie HttpOnly (inaccesible desde JS)."""
    response.set_cookie(
        key='refresh_token',
        value=token,
        httponly=True,
        secure=not settings.DEBUG,  # Solo HTTPS en producción
        samesite='Strict',
        max_age=60 * 60 * 24 * 7,  # 7 días
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
                .get(username=username, activo=1)
            )
        except Usuario.DoesNotExist:
            # Respuesta genérica para evitar enumeración de usuarios
            return Response(
                {'error': 'Credenciales inválidas.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Soporta passwords hasheados con Django Y texto plano (migración)
        stored = user.password or ''
        if stored.startswith(('pbkdf2_', 'bcrypt$', 'argon2')):
            password_ok = check_password(password, stored)
        else:
            password_ok = (password == stored)

        if not password_ok:
            return Response(
                {'error': 'Credenciales inválidas.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = _build_tokens(user)
        access  = refresh.access_token

        user_data = {
            'id':          user.id,
            'username':    user.username,
            'nombre':      user.nombre,
            'correo':      user.correo,
            'rol': {
                'id':       user.rol.id,
                'nombre':   user.rol.nombre,
                'permisos': user.rol.permisos,
            },
            'empresa_id':  user.empresa_id,
            'sucursal_id': user.sucursal_id,
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

        response = Response({'access': str(new_access)}, status=status.HTTP_200_OK)
        _set_refresh_cookie(response, str(refresh))  # Rotación del refresh token
        return response


class LogoutView(APIView):
    """
    POST /auth/logout/
    Invalida la cookie de sesión del cliente.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response(
            {'message': 'Sesión cerrada correctamente.'},
            status=status.HTTP_200_OK,
        )
        response.delete_cookie('refresh_token', path='/auth/')
        return response

