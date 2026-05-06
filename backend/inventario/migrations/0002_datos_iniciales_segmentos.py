from django.db import migrations


def crear_segmentos(apps, schema_editor):
    SegmentoCliente = apps.get_model("inventario", "SegmentoCliente")
    nombres = ["PyME", "Corporativo", "Retail"]
    for nombre in nombres:
        SegmentoCliente.objects.get_or_create(nombre=nombre)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("inventario", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(crear_segmentos, noop_reverse),
    ]
