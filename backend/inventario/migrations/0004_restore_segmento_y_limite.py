import django.db.models.deletion
from django.db import migrations, models


def seed_segmentos(apps, schema_editor):
    SegmentoCliente = apps.get_model("inventario", "SegmentoCliente")
    for nombre in ["PyME", "Corporativo", "Retail"]:
        SegmentoCliente.objects.get_or_create(nombre=nombre)


def assign_segmento_a_clientes(apps, schema_editor):
    Cliente = apps.get_model("inventario", "Cliente")
    SegmentoCliente = apps.get_model("inventario", "SegmentoCliente")
    primero = SegmentoCliente.objects.order_by("id").first()
    if not primero:
        return
    Cliente.objects.filter(segmento__isnull=True).update(segmento_id=primero.id)


class Migration(migrations.Migration):

    dependencies = [
        ("inventario", "0003_remove_cliente_limite_credito_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="SegmentoCliente",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("nombre", models.CharField(max_length=120)),
            ],
            options={
                "verbose_name": "Segmento de cliente",
                "verbose_name_plural": "Segmentos de cliente",
                "ordering": ["nombre"],
            },
        ),
        migrations.RunPython(seed_segmentos, migrations.RunPython.noop),
        migrations.AddField(
            model_name="cliente",
            name="limite_credito",
            field=models.PositiveIntegerField(
                default=0,
                verbose_name="Límite de crédito (entero, unidades monetarias)",
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="cliente",
            name="segmento",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="clientes",
                to="inventario.segmentocliente",
            ),
        ),
        migrations.RunPython(assign_segmento_a_clientes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="cliente",
            name="segmento",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="clientes",
                to="inventario.segmentocliente",
            ),
        ),
    ]
