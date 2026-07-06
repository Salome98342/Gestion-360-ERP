from django.utils import timezone
from rest_framework.permissions import BasePermission

from .models import LicenciaToken


def get_license_block_payload(empresa_id):
    """Retorna payload de bloqueo si la empresa no tiene licencia activa, o None si está OK."""
    if not empresa_id:
        return {
            'type': 'LICENSE',
            'status': 'NOT_FOUND',
            'fecha_vencimiento': None,
            'empresa_id': None,
        }

    now = timezone.now()
    licencia = (
        LicenciaToken.objects.filter(empresa_id=empresa_id)
        .order_by('-fecha_activacion', '-fecha_generacion')
        .first()
    )

    if licencia is None:
        return {
            'type': 'LICENSE',
            'status': 'NOT_FOUND',
            'fecha_vencimiento': None,
            'empresa_id': empresa_id,
        }

    estado = (licencia.estado or '').upper()
    fecha_venc = licencia.fecha_vencimiento

    # Algunas filas antiguas pueden guardar datetime naive en DB.
    # Normalizamos para comparar sin errores cuando USE_TZ=True.
    if fecha_venc is not None:
        if timezone.is_naive(fecha_venc) and timezone.is_aware(now):
            fecha_venc = timezone.make_aware(fecha_venc, timezone.get_current_timezone())
        elif timezone.is_aware(fecha_venc) and timezone.is_naive(now):
            now = timezone.make_aware(now, timezone.get_current_timezone())

    if estado != 'DISPONIBLE':
        return {
            'type': 'LICENSE',
            'status': 'INACTIVE',
            'fecha_vencimiento': fecha_venc.isoformat() if fecha_venc else None,
            'empresa_id': empresa_id,
        }

    if fecha_venc and fecha_venc < now:
        return {
            'type': 'LICENSE',
            'status': 'EXPIRED',
            'fecha_vencimiento': fecha_venc.isoformat(),
            'empresa_id': empresa_id,
        }

    return None


class LicenciaPermission(BasePermission):
    """Bloquea módulos cuando la empresa no tiene licencia activa.

    Responde con payload estructurado para que el frontend renderice un cartel:
    {
      "type": "LICENSE",
      "status": "NOT_FOUND" | "INACTIVE" | "EXPIRED",
      "fecha_vencimiento": "..." | null,
      "empresa_id": <id>
    }
    """

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        empresa_id = getattr(user, 'empresa_id', None) if user else None

        payload = get_license_block_payload(empresa_id)
        if payload is None:
            return True

        # DRF usa `permission.message` para construir la respuesta de denegación.
        # Si enviamos un dict, el 403 conserva esta estructura en el body.
        self.message = payload
        return False

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)

