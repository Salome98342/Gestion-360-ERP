from rest_framework.exceptions import PermissionDenied

from apps.empresas.models import Empresa


class EmpresaScopedViewSetMixin:
    """
    Limita los datos al usuario autenticado. Cada ViewSet puede declarar
    empresa_filter_path cuando la empresa no vive directamente en el modelo.
    """

    empresa_filter_path = 'empresa_id'

    def get_empresa_id(self):
        user = getattr(self.request, 'user', None)
        return getattr(user, 'empresa_id', None)

    def get_queryset(self):
        qs = super().get_queryset()
        empresa_id = self.get_empresa_id()
        if not empresa_id:
            return qs.none()
        return qs.filter(**{self.empresa_filter_path: empresa_id})

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['empresa_id'] = self.get_empresa_id()
        return context

    def perform_create(self, serializer):
        user = getattr(self.request, 'user', None)
        empresa_id = getattr(user, 'empresa_id', None)
        if not empresa_id:
            raise PermissionDenied('No hay una empresa asociada a la sesion.')

        # Evita errores 500 por violación de FK cuando la empresa asociada
        # al usuario no existe en la tabla (p.ej. seed desincronizado o schema distinto).
        if not Empresa.objects.filter(pk=empresa_id).exists():
            raise PermissionDenied(
                'La empresa asociada a la sesión no existe en la base de datos.'
            )

        model = serializer.Meta.model
        if any(field.name == 'empresa' for field in model._meta.fields):
            serializer.save(empresa_id=empresa_id)
        else:
            serializer.save()
