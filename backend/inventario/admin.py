from django.contrib import admin

from .models import Cliente, SegmentoCliente


@admin.register(SegmentoCliente)
class SegmentoClienteAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre")
    search_fields = ("nombre",)


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "nombre",
        "codigo_cliente",
        "ciudad",
        "fecha_registro",
        "limite_credito",
        "segmento",
    )
    list_filter = ("segmento", "fecha_registro")
    search_fields = ("nombre", "codigo_cliente", "ciudad")
