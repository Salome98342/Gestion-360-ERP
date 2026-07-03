from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ventas', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='venta',
            name='cliente_nombre',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='venta',
            name='cliente_documento',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='venta',
            name='metodo_pago',
            field=models.TextField(default='EFECTIVO'),
        ),
        migrations.AddField(
            model_name='venta',
            name='monto_recibido',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='venta',
            name='cambio',
            field=models.FloatField(default=0),
        ),
    ]
