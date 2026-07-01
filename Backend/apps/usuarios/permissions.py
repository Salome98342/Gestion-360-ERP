import json
from rest_framework.permissions import BasePermission

# Mapea acciones DRF a claves en el JSON de permisos del rol
_ACTION_MAP = {
    'list':           'ver',
    'retrieve':       'ver',
    'create':         'crear',
    'update':         'editar',
    'partial_update': 'editar',
    'destroy':        'eliminar',
    'toggle_activo':  'editar',
    'set_password':   'editar',
}


class RolPermission(BasePermission):
    """
    Verifica que el usuario autenticado tenga el permiso necesario en su rol
    para la acción solicitada sobre el módulo del ViewSet.

    Uso: definir `modulo = 'ventas'` en el ViewSet.

    Roles con permisos = NULL tienen acceso completo (estado inicial / admin).
    """
    message = 'No tienes permiso para realizar esta acción.'

    def has_permission(self, request, view):
        user = request.user

        # Sin usuario autenticado (o sin rol asignado) → denegar
        if not user or not hasattr(user, 'rol') or user.rol is None:
            return False

        modulo = getattr(view, 'modulo', None)
        if modulo is None:
            return True  # ViewSet sin módulo definido → permitir

        # Rol sin permisos configurados → acceso completo (rol admin inicial)
        raw = user.rol.permisos
        if not raw:
            return True

        action   = getattr(view, 'action', 'list')
        required = _ACTION_MAP.get(action, 'ver')

        try:
            perms = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return False

        return bool(perms.get(modulo, {}).get(required, False))
