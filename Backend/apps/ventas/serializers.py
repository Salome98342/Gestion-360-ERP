from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.inventario.models import Caja, Cliente, Producto
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


def _venta_estado(total, total_pagado, estado):
    if (estado or '').upper() == 'ANULADO':
        return 'ANULADO'
    return 'PAGADO' if total - total_pagado <= 0.01 else 'CREDITO'


def _estado_pago(total, total_pagado, estado):
    if (estado or '').upper() == 'ANULADO':
        return 'ANULADO'
    return 'PAGADO' if total - total_pagado <= 0.01 else (estado or 'PENDIENTE')


def _registrar_movimiento_caja(usuario, sucursal, tipo, monto, concepto, referencia):
    if not monto or monto <= 0:
        return
    caja = Caja.objects.filter(
        empresa=usuario.empresa,
        usuario=usuario,
        sucursal=sucursal,
        estado__iexact='ABIERTA',
    ).order_by('-fecha_apertura').first()
    if caja:
        MovimientoCaja.objects.create(
            caja=caja,
            tipo=tipo,
            concepto=concepto,
            referencia=referencia,
            monto=monto,
            fecha=timezone.now(),
        )


def _registrar_kardex(empresa, producto, sucursal, tipo, cantidad, costo_unitario, stock_anterior, stock_resultante, referencia, usuario):
    Kardex.objects.create(
        empresa=empresa,
        producto=producto,
        sucursal=sucursal,
        tipo_movimiento=tipo,
        cantidad=cantidad,
        costo_unitario=costo_unitario,
        stock_anterior=stock_anterior,
        stock_resultante=stock_resultante,
        referencia=referencia,
        usuario=usuario,
    )


class ItemVentaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemVenta
        fields = [
            'producto',
            'descripcion',
            'cantidad',
            'precio_unitario',
            'costo_unitario',
            'subtotal',
            'utilidad',
            'tipo_pago',
        ]
        extra_kwargs = {
            'producto': {'required': False, 'allow_null': True},
            'descripcion': {'required': False, 'allow_blank': True, 'allow_null': True},
            'costo_unitario': {'required': False},
            'subtotal': {'read_only': True},
            'utilidad': {'read_only': True},
        }


class ItemCompraWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemCompra
        fields = ['producto', 'cantidad', 'costo_unitario', 'subtotal']
        extra_kwargs = {
            'subtotal': {'read_only': True},
        }


class CompraSerializer(serializers.ModelSerializer):
    items = ItemCompraWriteSerializer(many=True, required=False)

    class Meta:
        model = Compra
        fields = [
            'id', 'empresa', 'proveedor', 'sucursal', 'usuario',
            'fecha', 'subtotal', 'impuesto', 'total', 'estado',
            'total_pagado', 'saldo_pendiente', 'items',
        ]
        read_only_fields = ['empresa', 'usuario', 'fecha', 'subtotal', 'total', 'saldo_pendiente']

    def validate(self, attrs):
        empresa_id = self.context.get('empresa_id')
        items = attrs.get('items') or []
        if self.instance is None and not items:
            raise serializers.ValidationError({'items': 'Debes agregar al menos un item a la compra.'})
        for field in ('proveedor', 'sucursal'):
            value = attrs.get(field)
            if value and empresa_id and value.empresa_id != empresa_id:
                raise serializers.ValidationError({field: 'No pertenece a tu empresa.'})
        for item in items:
            producto = item.get('producto')
            if producto and empresa_id and producto.empresa_id != empresa_id:
                raise serializers.ValidationError({'items': 'Uno de los productos no pertenece a tu empresa.'})
            if (item.get('cantidad') or 0) <= 0:
                raise serializers.ValidationError({'items': 'La cantidad debe ser mayor que cero.'})
            if (item.get('costo_unitario') or 0) < 0:
                raise serializers.ValidationError({'items': 'El costo unitario no puede ser negativo.'})
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context.get('request')
        if request and getattr(request, 'user', None):
            validated_data['usuario'] = request.user
            validated_data.setdefault('sucursal', request.user.sucursal)
        validated_data['fecha'] = timezone.now()

        subtotal = sum(float(item['cantidad']) * float(item['costo_unitario']) for item in items_data)
        impuesto = float(validated_data.get('impuesto') or 0)
        total = subtotal + impuesto
        total_pagado = float(validated_data.get('total_pagado') or 0)
        validated_data['subtotal'] = subtotal
        validated_data['total'] = total
        validated_data['saldo_pendiente'] = total - total_pagado
        if total_pagado - total > 0.01:
            raise serializers.ValidationError({'total_pagado': 'El pago no puede superar el total de la compra.'})
        validated_data['estado'] = _estado_pago(total, total_pagado, validated_data.get('estado'))

        with transaction.atomic():
            compra = Compra.objects.create(**validated_data)
            _registrar_movimiento_caja(
                compra.usuario, compra.sucursal, 'EGRESO', total_pagado,
                'Pago inicial de compra', f'Compra #{compra.id}',
            )
            for item in items_data:
                producto = Producto.objects.select_for_update().get(pk=item['producto'].pk)
                cantidad = float(item['cantidad'])
                costo_unitario = float(item['costo_unitario'])
                stock_anterior = float(producto.stock_actual or 0)
                stock_resultante = stock_anterior + cantidad
                if stock_resultante < stock_anterior:
                    raise serializers.ValidationError({
                        'items': f'La compra no puede disminuir el stock de {producto.nombre}.'
                    })
                if stock_resultante < 0:
                    raise serializers.ValidationError({
                        'items': f'El stock resultante de {producto.nombre} no puede ser negativo.'
                    })
                costo_anterior = float(producto.costo_promedio or 0)
                producto.costo_promedio = (
                    costo_unitario if stock_resultante <= 0
                    else ((stock_anterior * costo_anterior) + (cantidad * costo_unitario)) / stock_resultante
                )
                producto.stock_actual = stock_resultante
                producto.save(update_fields=['costo_promedio', 'stock_actual'])

                ItemCompra.objects.create(
                    compra=compra,
                    producto=producto,
                    cantidad=cantidad,
                    costo_unitario=costo_unitario,
                    subtotal=cantidad * costo_unitario,
                )
                _registrar_kardex(
                    compra.empresa, producto, compra.sucursal, 'COMPRA', cantidad, costo_unitario,
                    stock_anterior, stock_resultante, f'Compra #{compra.id}', compra.usuario,
                )
        return compra


class CompraReadSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    usuario_nombre   = serializers.CharField(source='usuario.nombre',   read_only=True)
    sucursal_nombre  = serializers.CharField(source='sucursal.nombre',  read_only=True, default=None)

    class Meta:
        model = Compra
        fields = [
            'id', 'empresa', 'proveedor', 'proveedor_nombre',
            'sucursal', 'sucursal_nombre', 'usuario', 'usuario_nombre',
            'fecha', 'subtotal', 'impuesto', 'total',
            'total_pagado', 'saldo_pendiente', 'estado',
        ]


class ItemCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemCompra
        fields = '__all__'

    def validate(self, attrs):
        empresa_id = self.context.get('empresa_id')
        compra = attrs.get('compra')
        producto = attrs.get('producto')
        for field, value in (('compra', compra), ('producto', producto)):
            if value and empresa_id and value.empresa_id != empresa_id:
                raise serializers.ValidationError({field: 'No pertenece a tu empresa.'})
        if compra and producto and compra.empresa_id != producto.empresa_id:
            raise serializers.ValidationError('La compra y el producto deben pertenecer a la misma empresa.')
        return attrs


class PagoProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = PagoProveedor
        fields = '__all__'
        read_only_fields = ['empresa', 'usuario', 'fecha']

    def validate_compra(self, value):
        empresa_id = self.context.get('empresa_id')
        if value and empresa_id and value.empresa_id != empresa_id:
            raise serializers.ValidationError('La compra no pertenece a tu empresa.')
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['fecha'] = timezone.now()
        if request and getattr(request, 'user', None):
            validated_data['usuario'] = request.user
        valor = float(validated_data['valor'])
        with transaction.atomic():
            compra = Compra.objects.select_for_update().get(pk=validated_data['compra'].pk)
            if valor <= 0:
                raise serializers.ValidationError({'valor': 'El pago debe ser mayor que cero.'})
            if valor - float(compra.saldo_pendiente or 0) > 0.01:
                raise serializers.ValidationError({'valor': 'El pago no puede superar el saldo pendiente.'})
            pago = super().create(validated_data)
            compra.total_pagado = float(compra.total_pagado or 0) + valor
            compra.saldo_pendiente = max(0, float(compra.total or 0) - compra.total_pagado)
            compra.estado = _estado_pago(compra.total, compra.total_pagado, compra.estado)
            compra.save(update_fields=['total_pagado', 'saldo_pendiente', 'estado'])
            _registrar_movimiento_caja(
                validated_data['usuario'], compra.sucursal, 'EGRESO', valor,
                'Pago a proveedor', f'Compra #{compra.id}',
            )
        return pago


class VentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venta
        fields = '__all__'
        read_only_fields = ['empresa', 'usuario', 'fecha']


class VentaWriteSerializer(serializers.ModelSerializer):
    items = ItemVentaWriteSerializer(many=True, required=False)

    class Meta:
        model = Venta
        fields = [
            'id', 'empresa', 'cliente', 'sucursal', 'usuario',
            'cliente_nombre', 'cliente_documento',
            'fecha', 'subtotal', 'descuento_porcentaje', 'descuento_valor',
            'subtotal_con_descuento', 'porcentaje_impuesto', 'valor_impuesto',
            'total', 'total_pagado', 'metodo_pago', 'monto_recibido', 'cambio',
            'saldo_pendiente', 'estado',
            'fecha_vencimiento', 'utilidad_total', 'items',
        ]
        extra_kwargs = {
            'cliente': {'required': False, 'allow_null': True},
            'subtotal': {'read_only': True},
            'descuento_valor': {'read_only': True},
            'subtotal_con_descuento': {'read_only': True},
            'valor_impuesto': {'read_only': True},
            'total': {'read_only': True},
            'cambio': {'read_only': True},
            'saldo_pendiente': {'read_only': True},
            'utilidad_total': {'read_only': True},
        }
        read_only_fields = ['empresa', 'usuario', 'fecha']

    def validate(self, attrs):
        empresa_id = self.context.get('empresa_id')
        if self.instance is None and not attrs.get('items'):
            raise serializers.ValidationError({'items': 'Debes agregar al menos un item a la venta.'})

        for field in ('cliente', 'sucursal'):
            value = attrs.get(field)
            if value and empresa_id and value.empresa_id != empresa_id:
                raise serializers.ValidationError({field: 'No pertenece a tu empresa.'})

        for item in attrs.get('items', []):
            producto = item.get('producto')
            if producto and empresa_id and producto.empresa_id != empresa_id:
                raise serializers.ValidationError({'items': 'Uno de los productos no pertenece a tu empresa.'})
        return attrs

    def _consolidar_items_por_producto(self, items_data):
        """Consolida cantidades por producto para evitar desincronización.

        Mantiene la primera descripción/tipo_pago (el precio_unitario/costo_unitario
        se calcula luego por item consolidado).
        """
        consolidado = {}
        orden = []
        for item in items_data:
            producto = item.get('producto')
            if producto is None:
                # La validación validate_items ya debería impedirlo.
                continue
            producto_id = producto.id
            if producto_id not in consolidado:
                consolidado[producto_id] = {
                    'producto': producto,
                    'descripcion': item.get('descripcion') or '',
                    'cantidad': 0.0,
                    'precio_unitario': float(item.get('precio_unitario') or 0),
                    'costo_unitario': float(item.get('costo_unitario') or 0) if item.get('costo_unitario') is not None else None,
                    'utilidad_hint': None,
                    'tipo_pago': item.get('tipo_pago') or 'EFECTIVO',
                }
                orden.append(producto_id)
            consolidado[producto_id]['cantidad'] += float(item['cantidad'])

        # Para efectos contables, para productos consolidados tomamos el primer precio/costo unitario
        # (si el front manda distintos precios por la misma referencia, eso ya es inconsistente).
        return [consolidado[pid] for pid in orden]


    def _ensure_cliente(self, data):
        nombre_input = (data.get('cliente_nombre') or '').strip()
        documento = (data.get('cliente_documento') or '').strip()
        if data.get('cliente') and not nombre_input and not documento:
            cliente = data['cliente']
            data['cliente_nombre'] = cliente.nombre or 'Consumidor final'
            data['cliente_documento'] = ''
            return

        request = self.context.get('request')
        empresa = data.get('empresa') or (request.user.empresa if request and getattr(request, 'user', None) else None)
        nombre = nombre_input or 'Consumidor final'
        lookup_name = f'{nombre} - {documento}' if documento else 'Consumidor final'
        cliente, _ = Cliente.objects.get_or_create(
            empresa=empresa,
            nombre=lookup_name,
            defaults={'telefono': documento or None, 'activo': 1},
        )
        data['cliente'] = cliente
        data['cliente_nombre'] = nombre
        data['cliente_documento'] = documento

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('Debes agregar al menos un item a la venta.')

        for item in items:
            cantidad = item.get('cantidad') or 0
            precio_unitario = item.get('precio_unitario') or 0

            if cantidad <= 0:
                raise serializers.ValidationError('La cantidad de cada item debe ser mayor que cero.')
            if precio_unitario < 0:
                raise serializers.ValidationError('El precio unitario no puede ser negativo.')

            # Evita que se creen/actualicen ventas con items sin producto.
            # Eso puede dejar desincronizado el inventario/kardex.
            producto = item.get('producto', serializers.empty)
            if producto in (None, serializers.empty):
                raise serializers.ValidationError({'items': 'Cada item debe tener un producto válido (no puede ser null).'})

        return items

    def validate(self, attrs):
        # Mantiene validaciones anteriores, pero garantiza que validate_items
        # se ejecute SIEMPRE con los items que llegan desde el front.
        attrs = super().validate(attrs) if hasattr(super(), 'validate') else attrs
        items = attrs.get('items')
        if items is not None:
            self.validate_items(items)
        return attrs



    def _validate_and_lock_stock(self, items_data, existing_items=None):
        """Valida stock y aplica locks consistentes dentro de un mismo transaction.

        existing_items:
          - en update() se usan para "restaurar" stock del estado anterior (antes de recalcular).
        """
        requested = {}
        restored = {}

        for item in items_data:
            producto = item.get('producto')
            if producto is not None:
                requested[producto.id] = requested.get(producto.id, 0) + float(item['cantidad'])

        for item in existing_items or []:
            if getattr(item, 'producto_id', None):
                restored[item.producto_id] = restored.get(item.producto_id, 0) + float(item.cantidad)

        # Lock por producto para evitar race conditions.
        producto_ids = list(requested.keys())
        productos = list(Producto.objects.select_for_update().filter(pk__in=producto_ids))
        producto_map = {p.id: p for p in productos}

        for producto_id, cantidad in requested.items():
            producto = producto_map.get(producto_id)
            if not producto:
                raise serializers.ValidationError({'items': 'Producto no encontrado.'})

            disponible = float(producto.stock_actual or 0) + restored.get(producto_id, 0)
            if cantidad > disponible:
                raise serializers.ValidationError({
                    'items': f'Stock insuficiente para {producto.nombre}. Disponible: {disponible:g}.'
                })

        return producto_map


    def _totals_from_items(self, items_data):
        subtotal = 0.0
        utilidad_total = 0.0
        for item in items_data:
            cantidad = float(item['cantidad'])
            precio_unitario = float(item['precio_unitario'])
            costo_unitario = float(item.get('costo_unitario') or 0)
            subtotal += cantidad * precio_unitario
            utilidad_total += cantidad * (precio_unitario - costo_unitario)
        return subtotal, utilidad_total

    def _apply_totals(self, data, subtotal, utilidad_total):
        descuento_porcentaje = float(data.get('descuento_porcentaje') or 0)
        descuento_valor = subtotal * descuento_porcentaje / 100
        subtotal_con_descuento = subtotal - descuento_valor

        porcentaje_impuesto = float(data.get('porcentaje_impuesto') or 0)
        valor_impuesto = subtotal_con_descuento * porcentaje_impuesto / 100
        total = subtotal_con_descuento + valor_impuesto

        total_pagado = min(float(data.get('total_pagado') or 0), total)
        saldo_pendiente = total - total_pagado
        metodo_pago = (data.get('metodo_pago') or 'EFECTIVO').upper()
        monto_recibido = float(data.get('monto_recibido') or 0)
        if (data.get('estado') or '').upper() == 'ANULADO':
            total_pagado = 0
            saldo_pendiente = 0
            monto_recibido = 0
        if monto_recibido <= 0 and total_pagado > 0:
            monto_recibido = total_pagado
        cambio = max(0, monto_recibido - total) if metodo_pago == 'EFECTIVO' else 0

        data['subtotal'] = subtotal
        data['descuento_valor'] = descuento_valor
        data['subtotal_con_descuento'] = subtotal_con_descuento
        data['valor_impuesto'] = valor_impuesto
        data['total'] = total
        data['total_pagado'] = total_pagado
        data['metodo_pago'] = metodo_pago
        data['monto_recibido'] = monto_recibido
        data['cambio'] = cambio
        data['saldo_pendiente'] = saldo_pendiente
        data['utilidad_total'] = utilidad_total

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context.get('request')
        if request and getattr(request, 'user', None):
            validated_data['empresa'] = request.user.empresa
            validated_data['usuario'] = request.user
        validated_data['fecha'] = timezone.now()
        self._ensure_cliente(validated_data)

        subtotal, utilidad_total = self._totals_from_items(items_data)
        self._apply_totals(validated_data, subtotal, utilidad_total)
        if float(validated_data['total_pagado'] or 0) - float(validated_data['total'] or 0) > 0.01:
            raise serializers.ValidationError({'total_pagado': 'El pago no puede superar el total de la venta.'})

        # Consolida por producto para que validación y aplicación usen exactamente los mismos totales.
        items_data = self._consolidar_items_por_producto(items_data)

        # Validación + locks deben ocurrir dentro del mismo atomic para consistencia.
        with transaction.atomic():
            # Asegura locks consistentes para los productos involucrados.
            producto_map = self._validate_and_lock_stock(items_data)


            validated_data['estado'] = _venta_estado(
                validated_data['total'],
                validated_data['total_pagado'],
                validated_data.get('estado'),
            )

            venta = Venta.objects.create(**validated_data)

            # Ajuste saldo cliente: criterio robusto (evitar string frágil).
            # Si cliente_nombre no coincide con el texto exacto, antes se rompía el saldo.
            # Aquí lo tratamos como "consumidor final" cuando el cliente aún no tiene documento o es el default.
            if venta.saldo_pendiente > 0:
                # Regla robusta: si el cliente es el default (consumidor final) normalmente
                # tiene documento vacío; en ese caso NO ajustamos saldo.
                # Si tu regla de negocio cambia, ajusta este criterio.
                es_consumidor_final = not (venta.cliente_documento or '').strip() and (
                    (venta.cliente_nombre or '').strip().lower() == 'consumidor final' or not (venta.cliente_nombre or '').strip()
                )
                if not es_consumidor_final:
                    venta.cliente.saldo_actual = float(venta.cliente.saldo_actual or 0) + venta.saldo_pendiente
                    venta.cliente.save(update_fields=['saldo_actual'])


            _registrar_movimiento_caja(
                venta.usuario,
                venta.sucursal,
                'INGRESO',
                float(venta.total_pagado or 0),
                'Pago inicial de venta',
                f'Venta #{venta.id}',
            )

            for item in items_data:
                cantidad = float(item['cantidad'])
                precio_unitario = float(item['precio_unitario'])
                producto = item.get('producto')

                producto_locked = producto_map.get(producto.id)
                if not producto_locked:
                    raise serializers.ValidationError({'items': 'Producto no encontrado.'})

                stock_anterior = float(producto_locked.stock_actual or 0)
                stock_resultante = stock_anterior - cantidad

                # Asegura que no quede negativo por errores de precisión.
                if stock_resultante < 0:
                    if stock_resultante > -0.0001:
                        stock_resultante = 0
                    else:
                        raise serializers.ValidationError({
                            'items': f'Stock insuficiente en {producto_locked.nombre}. Disponible: {stock_anterior:g}, solicitado: {cantidad:g}.'
                        })

                producto_locked.stock_actual = stock_resultante

                producto_locked.save(update_fields=['stock_actual'])


                costo_unitario = float(item.get('costo_unitario') or producto_locked.costo_promedio or 0)

                ItemVenta.objects.create(
                    venta=venta,
                    producto=producto_locked,
                    descripcion=item.get('descripcion') or '',
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    costo_unitario=costo_unitario,
                    subtotal=cantidad * precio_unitario,
                    utilidad=cantidad * (precio_unitario - costo_unitario),
                    tipo_pago=item.get('tipo_pago') or 'EFECTIVO',
                )

                _registrar_kardex(
                    venta.empresa,
                    producto_locked,
                    venta.sucursal,
                    'VENTA',
                    cantidad,
                    costo_unitario,
                    stock_anterior,
                    stock_resultante,
                    f'Venta #{venta.id}',
                    venta.usuario,
                )

        return venta



    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        old_saldo = float(instance.saldo_pendiente or 0)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        with transaction.atomic():
            data_for_cliente = {
                'empresa': instance.empresa,
                'cliente': instance.cliente if 'cliente' in validated_data else None,
                'cliente_nombre': getattr(instance, 'cliente_nombre', ''),
                'cliente_documento': getattr(instance, 'cliente_documento', ''),
            }
            self._ensure_cliente(data_for_cliente)
            instance.cliente = data_for_cliente['cliente']
            instance.cliente_nombre = data_for_cliente['cliente_nombre']
            instance.cliente_documento = data_for_cliente.get('cliente_documento') or ''

            old_items = list(instance.items.select_related('producto').all())
            if items_data is not None:
                is_annulled = (instance.estado or '').upper() == 'ANULADO'

                producto_map = None
                if not is_annulled:
                    # Revalida y bloquea productos de forma consistente.
                    producto_map = self._validate_and_lock_stock(items_data, old_items)

                    # Restaurar stock anterior y kardex de ajuste.
                    for old_item in old_items:
                        if old_item.producto_id:
                            producto_locked = producto_map.get(old_item.producto_id)
                            if not producto_locked:
                                producto_locked = Producto.objects.select_for_update().get(pk=old_item.producto_id)

                            stock_anterior = float(producto_locked.stock_actual or 0)
                            stock_resultante = stock_anterior + float(old_item.cantidad)
                            producto_locked.stock_actual = stock_resultante
                            producto_locked.save(update_fields=['stock_actual'])

                            _registrar_kardex(
                                instance.empresa,
                                producto_locked,
                                instance.sucursal,
                                'AJUSTE_VENTA',
                                float(old_item.cantidad),
                                float(old_item.costo_unitario or 0),
                                stock_anterior,
                                stock_resultante,
                                f'Ajuste venta #{instance.id}',
                                instance.usuario,
                            )

                instance.items.all().delete()

                # Consolida por producto para que validación y aplicación usen exactamente los mismos totales.
                items_data = self._consolidar_items_por_producto(items_data)

                for item in items_data:
                    cantidad = float(item['cantidad'])
                    precio_unitario = float(item['precio_unitario'])
                    producto = item.get('producto')

                    producto_locked = producto_map.get(producto.id) if producto_map else None

                    if producto_locked is not None and not is_annulled:
                        stock_anterior = float(producto_locked.stock_actual or 0)
                        stock_resultante = stock_anterior - cantidad

                        # Asegura que no quede negativo por errores de precisión.
                        if stock_resultante < 0:
                            if stock_resultante > -0.0001:
                                stock_resultante = 0
                            else:
                                raise serializers.ValidationError({
                                    'items': f'Stock insuficiente en {producto_locked.nombre}. Disponible: {stock_anterior:g}, solicitado: {cantidad:g}.'
                                })

                        producto_locked.stock_actual = stock_resultante

                        producto_locked.save(update_fields=['stock_actual'])

                        costo_unitario = float(item.get('costo_unitario') or producto_locked.costo_promedio or 0)

                        ItemVenta.objects.create(
                            venta=instance,
                            producto=producto_locked,
                            descripcion=item.get('descripcion') or '',
                            cantidad=cantidad,
                            precio_unitario=precio_unitario,
                            costo_unitario=costo_unitario,
                            subtotal=cantidad * precio_unitario,
                            utilidad=cantidad * (precio_unitario - costo_unitario),
                            tipo_pago=item.get('tipo_pago') or 'EFECTIVO',
                        )

                        _registrar_kardex(
                            instance.empresa,
                            producto_locked,
                            instance.sucursal,
                            'VENTA',
                            cantidad,
                            costo_unitario,
                            stock_anterior,
                            stock_resultante,
                            f'Venta #{instance.id}',
                            instance.usuario,
                        )
                    else:
                        # Si está anulada, no ajustamos stock.
                        costo_unitario = float(item.get('costo_unitario') or 0)
                        ItemVenta.objects.create(
                            venta=instance,
                            producto=producto,
                            descripcion=item.get('descripcion') or '',
                            cantidad=cantidad,
                            precio_unitario=precio_unitario,
                            costo_unitario=costo_unitario,
                            subtotal=cantidad * precio_unitario,
                            utilidad=cantidad * (precio_unitario - costo_unitario),
                            tipo_pago=item.get('tipo_pago') or 'EFECTIVO',
                        )



                subtotal, utilidad_total = self._totals_from_items(items_data)

            else:
                subtotal = sum(item.subtotal for item in instance.items.all())
                utilidad_total = sum(item.utilidad for item in instance.items.all())

            data = {
                'descuento_porcentaje': instance.descuento_porcentaje,
                'porcentaje_impuesto': instance.porcentaje_impuesto,
                'total_pagado': instance.total_pagado,
                'metodo_pago': instance.metodo_pago,
                'monto_recibido': instance.monto_recibido,
                'estado': instance.estado,
            }
            self._apply_totals(data, subtotal, utilidad_total)
            if float(data['total_pagado'] or 0) - float(data['total'] or 0) > 0.01:
                raise serializers.ValidationError({'total_pagado': 'El pago no puede superar el total de la venta.'})
            data['estado'] = _venta_estado(data['total'], data['total_pagado'], instance.estado)
            for field, value in data.items():
                setattr(instance, field, value)
            instance.save()
            delta_saldo = float(instance.saldo_pendiente or 0) - old_saldo
            if abs(delta_saldo) > 0.01:
                es_consumidor_final = not (instance.cliente_documento or '').strip() and (
                    (instance.cliente_nombre or '').strip().lower() == 'consumidor final' or not (instance.cliente_nombre or '').strip()
                )
                if not es_consumidor_final:
                    instance.cliente.saldo_actual = float(instance.cliente.saldo_actual or 0) + delta_saldo
                    instance.cliente.save(update_fields=['saldo_actual'])

        return instance



class VentaReadSerializer(serializers.ModelSerializer):
    cliente_catalogo_nombre = serializers.CharField(source='cliente.nombre',  read_only=True)
    usuario_nombre  = serializers.CharField(source='usuario.nombre',  read_only=True)
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)
    items = ItemVentaWriteSerializer(many=True, read_only=True)

    class Meta:
        model = Venta
        fields = [
            'id', 'empresa', 'cliente', 'cliente_nombre', 'cliente_documento', 'cliente_catalogo_nombre',
            'sucursal', 'sucursal_nombre', 'usuario', 'usuario_nombre',
            'fecha', 'fecha_vencimiento', 'subtotal', 'descuento_porcentaje',
            'descuento_valor', 'porcentaje_impuesto', 'valor_impuesto', 'total',
            'total_pagado', 'metodo_pago', 'monto_recibido', 'cambio',
            'saldo_pendiente', 'estado', 'utilidad_total',
            'items',
        ]


class ItemVentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemVenta
        fields = '__all__'

    def validate(self, attrs):
        empresa_id = self.context.get('empresa_id')
        venta = attrs.get('venta')
        producto = attrs.get('producto')
        for field, value in (('venta', venta), ('producto', producto)):
            if value and empresa_id and value.empresa_id != empresa_id:
                raise serializers.ValidationError({field: 'No pertenece a tu empresa.'})
        if venta and producto and producto.empresa_id != venta.empresa_id:
            raise serializers.ValidationError('La venta y el producto deben pertenecer a la misma empresa.')
        return attrs


class AbonoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Abono
        fields = '__all__'
        read_only_fields = ['empresa', 'usuario', 'fecha']

    def validate_venta(self, value):
        empresa_id = self.context.get('empresa_id')
        if value and empresa_id and value.empresa_id != empresa_id:
            raise serializers.ValidationError('La venta no pertenece a tu empresa.')
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['fecha'] = timezone.now()
        if request and getattr(request, 'user', None):
            validated_data['usuario'] = request.user
        valor = float(validated_data['valor'])
        with transaction.atomic():
            venta = Venta.objects.select_for_update().select_related('cliente').get(pk=validated_data['venta'].pk)
            if valor <= 0:
                raise serializers.ValidationError({'valor': 'El abono debe ser mayor que cero.'})
            if valor - float(venta.saldo_pendiente or 0) > 0.01:
                raise serializers.ValidationError({'valor': 'El abono no puede superar el saldo pendiente.'})
            abono = super().create(validated_data)
            venta.total_pagado = float(venta.total_pagado or 0) + valor
            venta.saldo_pendiente = max(0, float(venta.total or 0) - venta.total_pagado)
            venta.estado = 'PAGADO' if venta.saldo_pendiente <= 0.01 else venta.estado
            venta.save(update_fields=['total_pagado', 'saldo_pendiente', 'estado'])
            venta.cliente.saldo_actual = max(0, float(venta.cliente.saldo_actual or 0) - valor)
            venta.cliente.save(update_fields=['saldo_actual'])
            _registrar_movimiento_caja(
                validated_data['usuario'], venta.sucursal, 'INGRESO', valor,
                'Abono de cliente', f'Venta #{venta.id}',
            )
        return abono


class KardexSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kardex
        fields = '__all__'
        read_only_fields = ['empresa']

    def validate(self, attrs):
        empresa_id = self.context.get('empresa_id')
        for field in ('producto', 'sucursal'):
            value = attrs.get(field)
            if value and empresa_id and value.empresa_id != empresa_id:
                raise serializers.ValidationError({field: 'No pertenece a tu empresa.'})
        return attrs


class MovimientoCajaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoCaja
        fields = '__all__'
        read_only_fields = ['fecha']

    def validate(self, attrs):
        tipo = (attrs.get('tipo') or '').upper()
        if tipo not in ('INGRESO', 'EGRESO'):
            raise serializers.ValidationError({'tipo': 'Debe ser INGRESO o EGRESO.'})

        monto = attrs.get('monto')
        if monto is None or monto <= 0:
            raise serializers.ValidationError({'monto': 'El monto debe ser mayor que cero.'})

        caja = attrs.get('caja')
        if caja and str(caja.estado).upper() != 'ABIERTA':
            raise serializers.ValidationError({'caja': 'Solo puedes registrar movimientos en cajas abiertas.'})

        attrs['tipo'] = tipo
        return attrs

    def validate_caja(self, value):
        empresa_id = self.context.get('empresa_id')
        if value and empresa_id and value.empresa_id != empresa_id:
            raise serializers.ValidationError('La caja no pertenece a tu empresa.')
        return value

    def create(self, validated_data):
        validated_data['fecha'] = timezone.now()
        return super().create(validated_data)


class AuditoriaDescuentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditoriaDescuento
        fields = '__all__'
        read_only_fields = ['empresa', 'fecha']

    def validate(self, attrs):
        empresa_id = self.context.get('empresa_id')
        for field in ('venta', 'usuario_solicito', 'usuario_autorizo'):
            value = attrs.get(field)
            if value and empresa_id and value.empresa_id != empresa_id:
                raise serializers.ValidationError({field: 'No pertenece a tu empresa.'})
        return attrs

    def create(self, validated_data):
        validated_data['fecha'] = timezone.now()
        return super().create(validated_data)


class LogActividadSerializer(serializers.ModelSerializer):
    usuario_nombre   = serializers.CharField(source='usuario.nombre',   read_only=True)
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = LogActividad
        fields = [
            'id', 'empresa', 'usuario', 'usuario_nombre', 'usuario_username',
            'accion', 'descripcion', 'modulo', 'fecha',
        ]


class SecuenciasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Secuencias
        fields = '__all__'
        read_only_fields = ['empresa']


