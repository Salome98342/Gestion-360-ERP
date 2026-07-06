from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('empresas', '0003_alter_empresa_table_alter_licenciatoken_table_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE constraint_schema = 'public'
                      AND table_name = 'evento_empresa'
                      AND constraint_name = 'evento_empresa_empresa_id_c4d9617c_fk_empresas_empresa_id'
                ) THEN
                    ALTER TABLE public.evento_empresa
                    DROP CONSTRAINT evento_empresa_empresa_id_c4d9617c_fk_empresas_empresa_id;
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE constraint_schema = 'public'
                      AND table_name = 'evento_empresa'
                      AND constraint_name = 'evento_empresa_empresa_id_fk'
                ) THEN
                    ALTER TABLE public.evento_empresa
                    ADD CONSTRAINT evento_empresa_empresa_id_fk
                    FOREIGN KEY (empresa_id)
                    REFERENCES public.empresa(id)
                    ON DELETE CASCADE
                    DEFERRABLE INITIALLY DEFERRED
                    NOT VALID;
                END IF;
            END $$;
            """,
            reverse_sql="""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE constraint_schema = 'public'
                      AND table_name = 'evento_empresa'
                      AND constraint_name = 'evento_empresa_empresa_id_fk'
                ) THEN
                    ALTER TABLE public.evento_empresa
                    DROP CONSTRAINT evento_empresa_empresa_id_fk;
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = 'empresas_empresa'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE constraint_schema = 'public'
                      AND table_name = 'evento_empresa'
                      AND constraint_name = 'evento_empresa_empresa_id_c4d9617c_fk_empresas_empresa_id'
                ) THEN
                    ALTER TABLE public.evento_empresa
                    ADD CONSTRAINT evento_empresa_empresa_id_c4d9617c_fk_empresas_empresa_id
                    FOREIGN KEY (empresa_id)
                    REFERENCES public.empresas_empresa(id)
                    ON DELETE CASCADE
                    DEFERRABLE INITIALLY DEFERRED
                    NOT VALID;
                END IF;
            END $$;
            """,
        ),
    ]
