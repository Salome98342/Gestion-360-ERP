import json
from rest_framework.permissions import BasePermission

# Mapea acciones DRF a claves en el JSON de permisos del rol
_ACTION_MAP = {
    'list': 'ver',
    'retrieve': 'ver',
    'create': 'crear',
    'update': 'editar',
    'partial_update': 'editar',
    'destroy': 'eliminar',
    'toggle_activo': 'editar',
    'set_password': 'editar',
}


def is_admin_user(user) -> bool:
    """Determina si el usuario debe tratarse como administrador del tenant."""
    if not user or not hasattr(user, 'rol') or user.rol is None:
        return False

    rol = user.rol
    rol_nombre = (getattr(rol, 'nombre', '') or '').strip().lower()
    if 'admin' in rol_nombre:
        return True

    perms = getattr(rol, 'permisos', None)
    if perms in (None, '', {}, []):
        return True

    if isinstance(perms, dict):
        return bool(perms.get('__admin__', False))

    if isinstance(perms, str):
        txt = perms.strip().lower()
        if txt in ('', 'all', '*', 'admin'):
            return True
        try:
            data = json.loads(perms)
            if isinstance(data, dict) and data.get('__admin__') is True:
                return True
        except (json.JSONDecodeError, TypeError):
            return False

    return False


class IsAdminRole(BasePermission):
    message = 'Esta acción solo está disponible para el administrador.'

    def has_permission(self, request, view):
        return is_admin_user(getattr(request, 'user', None))


class RolPermission(BasePermission):
    """Permisos por rol (JSONField nativo) para cada módulo/acción solicitada.

    Uso: definir `modulo = 'ventas'` en el ViewSet.

    Reglas:
      - Si `rol.permisos` es NULL/vacío => acceso completo.
      - Si existe el módulo pero no contiene la acción => denegar.
    """

    message = 'No tienes permiso para realizar esta acción.'

    def _infer_required(self, request, view) -> str:
        action = getattr(view, 'action', None)
        if action:
            return (_ACTION_MAP.get(action) or 'ver').lower()

        method = (request.method or '').upper()
        if method in ('GET', 'HEAD'):
            return 'ver'
        if method == 'POST':
            return 'crear'
        if method in ('PUT', 'PATCH'):
            return 'editar'
        if method == 'DELETE':
            return 'eliminar'
        return 'ver'

    def has_permission(self, request, view):
        user = request.user

        # Sin usuario autenticado (o sin rol asignado) → denegar
        if not user or not hasattr(user, 'rol') or user.rol is None:
            return False

        modulo = getattr(view, 'modulo', None)
        if modulo is None:
            return True  # ViewSet sin módulo definido → permitir

        modulo = str(modulo).lower()

        perms = user.rol.permisos
        
        # Si permisos es NULL o dict vacío => acceso completo
        if not perms:
            return True
            
        # Fallback de seguridad en caso de que quede algún string por migrar
        if isinstance(perms, str):
            try:
                perms = json.loads(perms)
            except (json.JSONDecodeError, TypeError):
                return False

        if not isinstance(perms, dict):
            return False

        module_entry = perms.get(modulo)
        if not isinstance(module_entry, dict):
            return False

        required = self._infer_required(request, view)
        allowed = module_entry.get(required, False)
        return bool(allowed)