from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('admin', '0003_logentry_add_action_flag_choices'),
        ('usuarios', '0005_alter_usuario_empresa_alter_usuario_rol'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = 'django_admin_log'
                ) THEN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints
                        WHERE constraint_schema = 'public'
                          AND table_name = 'django_admin_log'
                          AND constraint_name = 'django_admin_log_user_id_c564eba6_fk_auth_user_id'
                    ) THEN
                        ALTER TABLE public.django_admin_log
                        DROP CONSTRAINT django_admin_log_user_id_c564eba6_fk_auth_user_id;
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'usuario'
                    ) AND NOT EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints
                        WHERE constraint_schema = 'public'
                          AND table_name = 'django_admin_log'
                          AND constraint_name = 'django_admin_log_user_id_fk_usuario'
                    ) THEN
                        ALTER TABLE public.django_admin_log
                        ADD CONSTRAINT django_admin_log_user_id_fk_usuario
                        FOREIGN KEY (user_id)
                        REFERENCES public.usuario(id)
                        DEFERRABLE INITIALLY DEFERRED;
                    END IF;
                END IF;
            END $$;
            """,
            reverse_sql="""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = 'django_admin_log'
                ) THEN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints
                        WHERE constraint_schema = 'public'
                          AND table_name = 'django_admin_log'
                          AND constraint_name = 'django_admin_log_user_id_fk_usuario'
                    ) THEN
                        ALTER TABLE public.django_admin_log
                        DROP CONSTRAINT django_admin_log_user_id_fk_usuario;
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'auth_user'
                    ) AND NOT EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints
                        WHERE constraint_schema = 'public'
                          AND table_name = 'django_admin_log'
                          AND constraint_name = 'django_admin_log_user_id_c564eba6_fk_auth_user_id'
                    ) THEN
                        ALTER TABLE public.django_admin_log
                        ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_auth_user_id
                        FOREIGN KEY (user_id)
                        REFERENCES public.auth_user(id)
                        DEFERRABLE INITIALLY DEFERRED;
                    END IF;
                END IF;
            END $$;
            """,
        )
    ]
