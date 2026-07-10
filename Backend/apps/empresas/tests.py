from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.empresas.models import Empresa, LicenciaToken, RenovacionLicencia
from apps.empresas.permissions import get_license_block_payload


class LicensePayloadTest(TestCase):
	def setUp(self):
		self.empresa = Empresa.objects.create(nombre='Empresa Licencia')

	def test_returns_not_found_when_company_has_no_license(self):
		payload = get_license_block_payload(self.empresa.id)

		self.assertIsNotNone(payload)
		self.assertEqual(payload['status'], 'NOT_FOUND')

	def test_returns_expired_when_license_is_past_due(self):
		LicenciaToken.objects.create(
			empresa=self.empresa,
			token='expired-token',
			fecha_activacion=timezone.now() - timedelta(days=40),
			fecha_vencimiento=timezone.now() - timedelta(days=1),
			estado='DISPONIBLE',
		)

		payload = get_license_block_payload(self.empresa.id)

		self.assertIsNotNone(payload)
		self.assertEqual(payload['status'], 'EXPIRED')

	def test_recent_renewal_unblocks_inactive_license(self):
		licencia = LicenciaToken.objects.create(
			empresa=self.empresa,
			token='inactive-token',
			fecha_activacion=timezone.now() - timedelta(days=60),
			fecha_vencimiento=timezone.now() - timedelta(days=10),
			estado='INACTIVO',
		)
		RenovacionLicencia.objects.create(
			licencia=licencia,
			meses_agregados=1,
			nueva_fecha_vencimiento=timezone.now() + timedelta(days=20),
			monto_pagado='150000.00',
		)

		payload = get_license_block_payload(self.empresa.id)

		self.assertIsNone(payload)
