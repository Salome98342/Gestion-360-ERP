from rest_framework import viewsets

from .models import Empresa, LicenciaToken, RenovacionLicencia
from .serializers import EmpresaSerializer, LicenciaTokenSerializer, RenovacionLicenciaSerializer


class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer


class LicenciaTokenViewSet(viewsets.ModelViewSet):
    queryset = LicenciaToken.objects.all()
    serializer_class = LicenciaTokenSerializer


class RenovacionLicenciaViewSet(viewsets.ModelViewSet):
    queryset = RenovacionLicencia.objects.all()
    serializer_class = RenovacionLicenciaSerializer

