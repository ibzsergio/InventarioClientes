from django.db import models


class SegmentoCliente(models.Model):
    """
    Tabla 1: segmentación comercial (relación uno a muchos con clientes).
    Campos tipo varchar/texto.
    """

    nombre = models.CharField(max_length=120)

    class Meta:
        verbose_name = "Segmento de cliente"
        verbose_name_plural = "Segmentos de cliente"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Cliente(models.Model):
    """
    Tabla 2: clientes registrados con tipos varchar, entero y fecha,
    enlazados a segmento mediante clave foránea.
    """

    nombre = models.CharField("Nombre o razón social", max_length=200)
    codigo_cliente = models.CharField("Código interno", max_length=64, unique=True)
    ciudad = models.CharField(max_length=120)
    fecha_registro = models.DateField("Fecha de registro")
    limite_credito = models.PositiveIntegerField(
        "Límite de crédito (entero, unidades monetarias)",
        default=0,
    )
    segmento = models.ForeignKey(
        SegmentoCliente,
        on_delete=models.PROTECT,
        related_name="clientes",
    )

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} ({self.codigo_cliente})"
