from rest_framework.exceptions import PermissionDenied


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
        empresa = getattr(user, 'empresa', None)
        if not empresa:
            raise PermissionDenied('No hay una empresa asociada a la sesion.')

        model = serializer.Meta.model
        if any(field.name == 'empresa' for field in model._meta.fields):
            serializer.save(empresa=empresa)
        else:
            serializer.save()

