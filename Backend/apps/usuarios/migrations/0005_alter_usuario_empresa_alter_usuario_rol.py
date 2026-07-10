from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0004_usuario_is_staff_usuario_is_superuser'),
    ]

    operations = [
        migrations.AlterField(
            model_name='usuario',
            name='empresa',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.CASCADE, related_name='usuario', to='empresas.empresa'),
        ),
        migrations.AlterField(
            model_name='usuario',
            name='rol',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.CASCADE, related_name='usuario', to='usuarios.rol'),
        ),
    ]