import json
import time
from datetime import timedelta

from django.http import HttpResponse
from django.http import JsonResponse, StreamingHttpResponse
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.mixins import EmpresaScopedViewSetMixin
from apps.usuarios.permissions import RolPermission
from apps.usuarios.permissions import IsAdminRole, is_admin_user
from apps.usuarios.models import Usuario
from apps.empresas.permissions import LicenciaPermission
from apps.empresas.models import EventoEmpresa



from .models import (
    Compra,
    ItemCompra,
    PagoProveedor,
    Venta,
    ItemVenta,
    Abono,
    Kardex,
    MovimientoCaja,
    AuditoriaDescuento,
    LogActividad,
    Secuencias,
)
from .serializers import (
    CompraSerializer,
    CompraReadSerializer,
    ItemCompraSerializer,
    PagoProveedorSerializer,
    VentaSerializer,
    VentaWriteSerializer,
    VentaReadSerializer,
    ItemVentaSerializer,
    AbonoSerializer,
    KardexSerializer,
    MovimientoCajaSerializer,
    AuditoriaDescuentoSerializer,
    LogActividadSerializer,
    SecuenciasSerializer,
)


def _pdf_escape(value):
    return str(value).replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def _simple_pdf(lines):
    content = ['BT', '/F1 11 Tf', '50 790 Td', '14 TL']
    for line in lines:
        content.append(f'({_pdf_escape(line)}) Tj')
        content.append('T*')
    content.append('ET')
    stream = '\n'.join(content).encode('latin-1', errors='replace')

    objects = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        b'<< /Length ' + str(len(stream)).encode('ascii') + b' >>\nstream\n' + stream + b'\nendstream',
    ]

    pdf = bytearray(b'%PDF-1.4\n')
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f'{index} 0 obj\n'.encode('ascii'))
        pdf.extend(obj)
        pdf.extend(b'\nendobj\n')

    xref = len(pdf)
    pdf.extend(f'xref\n0 {len(objects) + 1}\n'.encode('ascii'))
    pdf.extend(b'0000000000 65535 f \n')
    for offset in offsets[1:]:
        pdf.extend(f'{offset:010d} 00000 n \n'.encode('ascii'))
    pdf.extend(
        f'trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode('ascii')
    )
    return bytes(pdf)


class CompraViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'compras'
    permission_classes = [RolPermission, LicenciaPermission]

    queryset           = Compra.objects.all()
    serializer_class   = CompraReadSerializer

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return CompraSerializer
        return CompraReadSerializer

    def get_queryset(self):
        qs = super().get_queryset().select_related('proveedor', 'usuario', 'sucursal').order_by('-fecha')
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado__iexact=estado)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        compra = serializer.save(empresa=request.user.empresa)
        self.registrar_auditoria('create', compra, extra_descripcion=f'Total={compra.total:,.2f}; estado={compra.estado}.')
        read_serializer = CompraReadSerializer(compra, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ItemCompraViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'compras'
    permission_classes = [RolPermission, LicenciaPermission]

    queryset = ItemCompra.objects.all()
    serializer_class = ItemCompraSerializer
    empresa_filter_path = 'compra__empresa_id'


class PagoProveedorViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'compras'
    permission_classes = [RolPermission, LicenciaPermission]

    queryset = PagoProveedor.objects.all()
    serializer_class = PagoProveedorSerializer


class VentaViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission, LicenciaPermission]

    queryset           = Venta.objects.all()
    serializer_class   = VentaReadSerializer

    def get_queryset(self):
        qs = super().get_queryset().select_related('cliente', 'usuario', 'sucursal').order_by('-fecha')
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado__iexact=estado)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return VentaWriteSerializer
        return VentaReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        venta = serializer.save()
        self.registrar_auditoria(
            'create',
            venta,
            extra_descripcion=f'Total={venta.total:,.2f}; pagado={venta.total_pagado:,.2f}; estado={venta.estado}.',
        )
        read_serializer = VentaReadSerializer(venta, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['get'], url_path='factura')
    def factura(self, request, pk=None):
        venta = self.get_object()
        items = venta.items.select_related('producto').all()
        lines = [
            'Gestion 360 - Factura de venta',
            f'Factura: V-{venta.id:06d}',
            f'Fecha: {venta.fecha:%Y-%m-%d %H:%M}',
            f'Cliente: {venta.cliente_nombre or venta.cliente.nombre}',
            f'Documento: {venta.cliente_documento or "-"}',
            f'Vendedor: {venta.usuario.nombre}',
            f'Sucursal: {venta.sucursal.nombre}',
            f'Estado: {venta.estado}',
            f'Pago: {venta.metodo_pago}',
            '',
            'Items',
        ]
        for item in items:
            nombre = item.descripcion or (item.producto.nombre if item.producto else 'Item')
            lines.append(
                f'- {nombre}: {item.cantidad:g} x {item.precio_unitario:,.0f} = {item.subtotal:,.0f}'
            )
        lines.extend([
            '',
            f'Subtotal: {venta.subtotal:,.0f}',
            f'Descuento: {venta.descuento_valor:,.0f}',
            f'Impuesto: {venta.valor_impuesto:,.0f}',
            f'Total: {venta.total:,.0f}',
            f'Pagado: {venta.total_pagado:,.0f}',
            f'Recibido: {venta.monto_recibido:,.0f}',
            f'Cambio: {venta.cambio:,.0f}',
            f'Saldo pendiente: {venta.saldo_pendiente:,.0f}',
        ])
        response = HttpResponse(_simple_pdf(lines), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="factura-venta-{venta.id}.pdf"'
        return response




class ItemVentaViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):

    modulo             = 'ventas'
    permission_classes = [RolPermission, LicenciaPermission]
    queryset = ItemVenta.objects.all()
    serializer_class = ItemVentaSerializer
    empresa_filter_path = 'venta__empresa_id'


class AbonoViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission, LicenciaPermission]

    queryset = Abono.objects.all()
    serializer_class = AbonoSerializer


class KardexViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'inventario'
    permission_classes = [RolPermission, LicenciaPermission]

    queryset = Kardex.objects.all()
    serializer_class = KardexSerializer


class MovimientoCajaViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'caja'
    permission_classes = [RolPermission, LicenciaPermission]

    queryset = MovimientoCaja.objects.all()
    serializer_class = MovimientoCajaSerializer
    empresa_filter_path = 'caja__empresa_id'

    def get_queryset(self):
        qs = super().get_queryset().select_related('caja').order_by('-fecha')
        caja_id = self.request.query_params.get('caja')
        tipo = self.request.query_params.get('tipo')
        if caja_id:
            qs = qs.filter(caja_id=caja_id)
        if tipo:
            qs = qs.filter(tipo__iexact=tipo)
        return qs


class AuditoriaDescuentoViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission, LicenciaPermission]

    queryset = AuditoriaDescuento.objects.all()
    serializer_class = AuditoriaDescuentoSerializer


class LogActividadViewSet(EmpresaScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """Solo lectura. Filtra por ?usuario=id y/o ?modulo=nombre."""
    modulo             = 'usuarios'
    permission_classes = [RolPermission, LicenciaPermission, IsAdminRole]

    queryset = LogActividad.objects.all()
    serializer_class = LogActividadSerializer

    def get_queryset(self):
        qs = super().get_queryset().select_related('usuario').order_by('-fecha')
        usuario_id = self.request.query_params.get('usuario')
        modulo     = self.request.query_params.get('modulo')
        q          = self.request.query_params.get('q')
        desde      = self.request.query_params.get('desde')
        hasta      = self.request.query_params.get('hasta')
        incluir_tecnico = (self.request.query_params.get('incluir_tecnico') or '').lower() in ('1', 'true', 'si', 'yes')
        if usuario_id:
            qs = qs.filter(usuario_id=usuario_id)
        if modulo:
            qs = qs.filter(modulo__iexact=modulo)
        if q:
            qs = qs.filter(Q(descripcion__icontains=q) | Q(accion__icontains=q))
        if desde:
            qs = qs.filter(fecha__date__gte=desde)
        if hasta:
            qs = qs.filter(fecha__date__lte=hasta)

        # Oculta ruido técnico heredado de triggers SQL (INSERT/UPDATE/DELETE)
        # a menos que se solicite explícitamente.
        if not incluir_tecnico:
            qs = qs.exclude(accion__in=['INSERT', 'UPDATE', 'DELETE'])
            qs = qs.exclude(descripcion__icontains='Se alter')

        limite_raw = self.request.query_params.get('limit')
        try:
            limite = int(limite_raw) if limite_raw else 200
        except ValueError:
            limite = 200
        limite = min(max(limite, 1), 500)
        qs = qs[:limite]
        return qs


def _resolve_user_from_access_token(access_token: str):
    try:
        token = AccessToken(access_token)
    except TokenError:
        return None

    user_id = token.get('user_id')
    if not user_id:
        return None

    return Usuario.objects.select_related('rol').filter(id=user_id, activo=True).first()


def _sse_message(*, event_name: str, data: dict, event_id: int | None = None) -> str:
    lines = []
    if event_id is not None:
        lines.append(f'id: {event_id}')
    lines.append(f'event: {event_name}')
    payload = json.dumps(data, ensure_ascii=False)
    for payload_line in payload.splitlines() or ['{}']:
        lines.append(f'data: {payload_line}')
    lines.append('')
    return '\n'.join(lines) + '\n'


def stream_admin_notifications(request):
    """SSE de notificaciones en segundo plano para administradores."""
    access_token = (request.GET.get('access_token') or '').strip()
    if not access_token:
        return JsonResponse({'detail': 'Token requerido.'}, status=401)

    user = _resolve_user_from_access_token(access_token)
    if user is None:
        return JsonResponse({'detail': 'Token inválido o expirado.'}, status=401)

    if not is_admin_user(user):
        return JsonResponse({'detail': 'Solo el administrador puede suscribirse.'}, status=403)

    empresa_id = user.empresa_id
    last_id_raw = (request.GET.get('last_id') or '0').strip()
    try:
        last_seen_log_id = int(last_id_raw)
    except ValueError:
        last_seen_log_id = 0

    window_raw = (request.GET.get('ventana_minutos') or '60').strip()
    try:
        ventana_minutos = int(window_raw)
    except ValueError:
        ventana_minutos = 60
    ventana_minutos = min(max(ventana_minutos, 5), 1440)

    def stream():
        nonlocal last_seen_log_id
        sent_event_ids = set()
        heartbeat_at = time.monotonic()

        # Handshake inicial.
        yield ': connected\n\n'

        while True:
            ahora = timezone.now()

            nuevos_logs = (
                LogActividad.objects
                .select_related('usuario')
                .filter(empresa_id=empresa_id, id__gt=last_seen_log_id)
                .exclude(accion__in=['INSERT', 'UPDATE', 'DELETE'])
                .exclude(descripcion__icontains='Se alter')
                .order_by('id')[:30]
            )

            for log in nuevos_logs:
                last_seen_log_id = log.id
                yield _sse_message(
                    event_name='log',
                    event_id=log.id,
                    data={
                        'kind': 'log',
                        'id': log.id,
                        'accion': log.accion,
                        'descripcion': log.descripcion,
                        'modulo': log.modulo,
                        'fecha': log.fecha.isoformat(),
                        'usuario_nombre': getattr(log.usuario, 'nombre', ''),
                    },
                )

            limite_eventos = ahora + timedelta(minutes=ventana_minutos)
            eventos = (
                EventoEmpresa.objects
                .filter(
                    empresa_id=empresa_id,
                    completado=0,
                    fecha__gte=ahora,
                    fecha__lte=limite_eventos,
                )
                .order_by('fecha')[:20]
            )
            for evento in eventos:
                if evento.id in sent_event_ids:
                    continue
                sent_event_ids.add(evento.id)
                yield _sse_message(
                    event_name='evento',
                    event_id=evento.id,
                    data={
                        'kind': 'evento',
                        'id': evento.id,
                        'titulo': evento.titulo,
                        'descripcion': evento.descripcion,
                        'tipo': evento.tipo,
                        'fecha': evento.fecha.isoformat(),
                    },
                )

            if time.monotonic() - heartbeat_at >= 20:
                heartbeat_at = time.monotonic()
                yield ': heartbeat\n\n'

            time.sleep(8)

    response = StreamingHttpResponse(stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


class SecuenciasViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    modulo             = 'ventas'
    permission_classes = [RolPermission, LicenciaPermission]

    queryset = Secuencias.objects.all()
    serializer_class = SecuenciasSerializer
