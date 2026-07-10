from rest_framework.exceptions import PermissionDenied
from django.utils import timezone

from apps.empresas.models import Empresa


class EmpresaScopedViewSetMixin:
    """
    Limita los datos al usuario autenticado. Cada ViewSet puede declarar
    empresa_filter_path cuando la empresa no vive directamente en el modelo.
    """

    empresa_filter_path = 'empresa_id'

    ACTION_LABELS = {
        'create': 'creo',
        'update': 'edito',
        'partial_update': 'edito',
        'destroy': 'elimino',
    }

    MODULO_LABELS = {
        'ventas': 'Ventas',
        'compras': 'Compras',
        'inventario': 'Inventario',
        'usuarios': 'Usuarios',
        'empresas': 'Empresas',
        'reportes': 'Reportes',
        'caja': 'Caja',
    }

    def get_empresa_id(self):
        user = getattr(self.request, 'user', None)
        if getattr(user, 'is_superuser', False):
            return None
        return getattr(user, 'empresa_id', None)

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, 'user', None)
        if getattr(user, 'is_superuser', False):
            return qs
        empresa_id = self.get_empresa_id()
        if not empresa_id:
            return qs.none()
        return qs.filter(**{self.empresa_filter_path: empresa_id})

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['empresa_id'] = self.get_empresa_id()
        return context

    def _module_label(self):
        modulo = getattr(self, 'modulo', None) or 'sistema'
        return self.MODULO_LABELS.get(modulo, str(modulo).capitalize())

    def _entity_label(self, instance):
        model = getattr(instance, '_meta', None)
        if model is not None:
            return getattr(model, 'verbose_name', instance.__class__.__name__).replace('_', ' ')
        return instance.__class__.__name__.lower()

    def _entity_ref(self, instance):
        for field in ('nombre', 'titulo', 'username'):
            value = getattr(instance, field, None)
            if value:
                return f'{field}={value}'
        return f'id={getattr(instance, "id", "-")}'

    def _snapshot_instance(self, instance):
        data = {}
        for field in getattr(instance, '_meta').fields:
            if field.name in ('id', 'fecha', 'fecha_creacion', 'creado_en'):
                continue
            data[field.name] = getattr(instance, field.name, None)
        return data

    def _diff_snapshot(self, before, after):
        cambios = []
        for key, old_value in before.items():
            new_value = after.get(key)
            if old_value != new_value:
                cambios.append(f'{key}: {old_value} -> {new_value}')
            if len(cambios) >= 5:
                break
        return '; '.join(cambios)

    def _registrar_actividad(self, *, user, empresa_id, accion, descripcion, modulo):
        from apps.ventas.models import LogActividad

        LogActividad.objects.create(
            empresa_id=empresa_id,
            usuario=user,
            accion=accion,
            descripcion=descripcion,
            modulo=modulo,
        )

    def _registrar_evento(self, *, empresa_id, titulo, descripcion, tipo='SISTEMA'):
        from apps.empresas.models import EventoEmpresa

        EventoEmpresa.objects.create(
            empresa_id=empresa_id,
            titulo=titulo,
            descripcion=descripcion,
            fecha=timezone.now(),
            tipo=tipo,
            completado=0,
        )

    def registrar_auditoria(self, action_key, instance, extra_descripcion=None, include_event=True):
        user = getattr(self.request, 'user', None)
        empresa_id = self.get_empresa_id()
        if not user or not empresa_id:
            return

        modulo = getattr(self, 'modulo', None) or 'sistema'
        action_label = self.ACTION_LABELS.get(action_key, action_key)
        entidad = self._entity_label(instance)
        referencia = self._entity_ref(instance)
        accion = f'{action_label} {entidad}'
        descripcion = f'{self._module_label()}: {entidad} ({referencia}).'
        if extra_descripcion:
            descripcion = f'{descripcion} {extra_descripcion}'

        self._registrar_actividad(
            user=user,
            empresa_id=empresa_id,
            accion=accion,
            descripcion=descripcion,
            modulo=modulo,
        )
        if include_event:
            self._registrar_evento(
                empresa_id=empresa_id,
                titulo=f'{self._module_label()}: {accion}',
                descripcion=descripcion,
            )

    def perform_create(self, serializer):
        user = getattr(self.request, 'user', None)
        if getattr(user, 'is_superuser', False):
            instance = serializer.save()
            self.registrar_auditoria('create', instance)
            return

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
            instance = serializer.save(empresa_id=empresa_id)
        else:
            instance = serializer.save()

        self.registrar_auditoria('create', instance)

    def perform_update(self, serializer):
        instance = serializer.instance
        before = self._snapshot_instance(instance)
        updated_instance = serializer.save()
        after = self._snapshot_instance(updated_instance)
        cambios = self._diff_snapshot(before, after)
        extra = f'Cambios: {cambios}' if cambios else None
        self.registrar_auditoria('update', updated_instance, extra_descripcion=extra)

    def perform_destroy(self, instance):
        # Guardamos referencia antes de eliminar para dejar trazabilidad.
        self.registrar_auditoria('destroy', instance)
        instance.delete()
