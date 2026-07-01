from rest_framework import viewsets

from apps.usuarios.permissions import RolPermission
from .models import Empresa, LicenciaToken, RenovacionLicencia
from .serializers import EmpresaSerializer, LicenciaTokenSerializer, RenovacionLicenciaSerializer


class EmpresaViewSet(viewsets.ModelViewSet):
    modulo             = 'empresas'
    permission_classes = [RolPermission]
    queryset           = Empresa.objects.all()
    serializer_class   = EmpresaSerializer


class LicenciaTokenViewSet(viewsets.ModelViewSet):
    modulo             = 'empresas'
    permission_classes = [RolPermission]
    queryset           = LicenciaToken.objects.all()
    serializer_class   = LicenciaTokenSerializer


class RenovacionLicenciaViewSet(viewsets.ModelViewSet):
    modulo             = 'empresas'
    permission_classes = [RolPermission]
    queryset           = RenovacionLicencia.objects.all()
    serializer_class   = RenovacionLicenciaSerializer

