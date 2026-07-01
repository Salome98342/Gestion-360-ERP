from rest_framework import serializers
from .models import Empresa, LicenciaToken, RenovacionLicencia


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = '__all__'


class LicenciaTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = LicenciaToken
        fields = '__all__'


class RenovacionLicenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RenovacionLicencia
        fields = '__all__'

