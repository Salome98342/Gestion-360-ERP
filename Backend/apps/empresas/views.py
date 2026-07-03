from rest_framework import viewsets

from apps.mixins import EmpresaScopedViewSetMixin
from apps.usuarios.permissions import RolPermission
from .models import Empresa, LicenciaToken, RenovacionLicencia, EventoEmpresa
from .serializers import (
    EmpresaSerializer,
    LicenciaTokenSerializer,
    RenovacionLicenciaSerializer,
    EventoEmpresaSerializer,
)


class EmpresaViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'empresas'
    permission_classes = [RolPermission]
    queryset           = Empresa.objects.all()
    serializer_class   = EmpresaSerializer
    empresa_filter_path = 'id'


class LicenciaTokenViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'empresas'
    permission_classes = [RolPermission]
    queryset           = LicenciaToken.objects.all()
    serializer_class   = LicenciaTokenSerializer


class RenovacionLicenciaViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'empresas'
    permission_classes = [RolPermission]
    queryset           = RenovacionLicencia.objects.all()
    serializer_class   = RenovacionLicenciaSerializer
    empresa_filter_path = 'licencia__empresa_id'


class EventoEmpresaViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'reportes'
    permission_classes = [RolPermission]
    queryset           = EventoEmpresa.objects.all()
    serializer_class   = EventoEmpresaSerializer

    def get_queryset(self):
        qs = super().get_queryset().order_by('fecha')
        desde = self.request.query_params.get('desde')
        hasta = self.request.query_params.get('hasta')
        if desde:
            qs = qs.filter(fecha__date__gte=desde)
        if hasta:
            qs = qs.filter(fecha__date__lte=hasta)
        return qs

