from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0004_alter_caja_estado_alter_caja_fecha_apertura_and_more'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='caja',
            constraint=models.UniqueConstraint(
                condition=models.Q(('estado', 'ABIERTA')),
                fields=('empresa', 'sucursal', 'usuario'),
                name='unique_open_caja_per_user_branch',
            ),
        ),
    ]