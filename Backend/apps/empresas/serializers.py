from rest_framework import serializers
from .models import Empresa, LicenciaToken, RenovacionLicencia, EventoEmpresa


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = '__all__'


class LicenciaTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = LicenciaToken
        fields = '__all__'
        read_only_fields = ['empresa']


class RenovacionLicenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RenovacionLicencia
        fields = '__all__'

    def validate_licencia(self, value):
        empresa_id = self.context.get('empresa_id')
        if value and empresa_id and value.empresa_id != empresa_id:
            raise serializers.ValidationError('La licencia no pertenece a tu empresa.')
        return value


class EventoEmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoEmpresa
        fields = '__all__'
        read_only_fields = ['empresa', 'creado_en']

