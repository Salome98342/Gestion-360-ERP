from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings

from .models import Usuario


class UsuarioJWTAuthentication(JWTAuthentication):
    """
    Autenticación JWT que resuelve el usuario desde el modelo Usuario
    personalizado de ERP en lugar de Django auth.User.
    """

    def get_user(self, validated_token):
        user_id_claim = api_settings.USER_ID_CLAIM

        if user_id_claim not in validated_token:
            raise InvalidToken(f'El token no contiene el claim "{user_id_claim}".')

        user_id = validated_token[user_id_claim]

        try:
            usuario = Usuario.objects.select_related('rol', 'sucursal').get(id=user_id)
        except Usuario.DoesNotExist:
            raise AuthenticationFailed('Usuario no encontrado.', code='user_not_found')

        if not usuario.activo:
            raise AuthenticationFailed('Esta cuenta está desactivada.', code='user_inactive')

        return usuario