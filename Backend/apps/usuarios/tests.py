from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from apps.empresas.models import Empresa, LicenciaToken
from apps.usuarios.models import Rol, Usuario
from apps.usuarios.permissions import RolPermission, is_admin_user
from apps.usuarios.views import LoginView


class _DummyView:
	modulo = 'ventas'
	action = 'create'


class RolPermissionTest(TestCase):
	def setUp(self):
		self.empresa = Empresa.objects.create(nombre='Empresa Test')
		self.factory = APIRequestFactory()

	def _build_user(self, *, permisos, role_name='Operador'):
		rol = Rol.objects.create(empresa=self.empresa, nombre=role_name, permisos=permisos)
		return Usuario.objects.create(
			empresa=self.empresa,
			rol=rol,
			nombre='Usuario Test',
			username=f'user-{rol.id}',
			password='pbkdf2_sha256$600000$fake$fakehash',
			activo=True,
		)

	def test_denies_when_role_has_no_permissions(self):
		user = self._build_user(permisos=None)
		request = self.factory.post('/ventas/')
		request.user = user

		allowed = RolPermission().has_permission(request, _DummyView())

		self.assertFalse(allowed)

	def test_allows_explicit_module_permission(self):
		user = self._build_user(permisos={'ventas': {'crear': True}})
		request = self.factory.post('/ventas/')
		request.user = user

		allowed = RolPermission().has_permission(request, _DummyView())

		self.assertTrue(allowed)

	def test_admin_flag_is_required_for_admin_shortcut(self):
		user = self._build_user(permisos={})
		self.assertFalse(is_admin_user(user))

		admin_user = self._build_user(permisos={'__admin__': True})
		self.assertTrue(is_admin_user(admin_user))

	def test_superuser_bypasses_role_requirement(self):
		user = Usuario.objects.create_user(
			nombre='Platform Root',
			username='platform-root',
			password='PasswordSegura123!',
			is_superuser=True,
			is_staff=True,
		)
		request = self.factory.post('/ventas/')
		request.user = user

		allowed = RolPermission().has_permission(request, _DummyView())

		self.assertTrue(allowed)
		self.assertTrue(is_admin_user(user))


class LoginViewSecurityTest(TestCase):
	def setUp(self):
		self.empresa = Empresa.objects.create(nombre='Empresa Login')
		self.rol = Rol.objects.create(
			empresa=self.empresa,
			nombre='Administrador',
			permisos={'__admin__': True},
		)
		LicenciaToken.objects.create(
			empresa=self.empresa,
			token='licencia-activa-login',
			fecha_activacion=timezone.now(),
			fecha_vencimiento=timezone.now() + timedelta(days=30),
			estado='DISPONIBLE',
		)
		self.factory = APIRequestFactory()

	def test_login_rejects_plaintext_legacy_passwords(self):
		Usuario.objects.create(
			empresa=self.empresa,
			rol=self.rol,
			nombre='Legacy User',
			username='legacy-user',
			password='123456',
			activo=True,
		)
		request = self.factory.post(
			'/auth/login/',
			{'username': 'legacy-user', 'password': '123456'},
			format='json',
		)

		response = LoginView.as_view()(request)

		self.assertEqual(response.status_code, 403)
		self.assertIn('restablecimiento de contraseña', str(response.data['error']).lower())


class UsuarioManagerTest(TestCase):
	def test_create_superuser_sets_required_flags(self):
		user = Usuario.objects.create_superuser(
			username='super-admin',
			password='PasswordSegura123!',
			nombre='Super Admin',
		)

		self.assertTrue(user.is_staff)
		self.assertTrue(user.is_superuser)
		self.assertTrue(user.activo)
		self.assertIsNone(user.empresa)
		self.assertIsNone(user.rol)
