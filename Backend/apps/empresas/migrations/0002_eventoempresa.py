import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('empresas', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='EventoEmpresa',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titulo', models.TextField()),
                ('descripcion', models.TextField(blank=True, null=True)),
                ('fecha', models.DateTimeField()),
                ('tipo', models.TextField(default='GENERAL')),
                ('completado', models.IntegerField(default=0)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('empresa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='eventos', to='empresas.empresa')),
            ],
            options={
                'db_table': 'evento_empresa',
            },
        ),
    ]
