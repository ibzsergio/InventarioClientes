from rest_framework import serializers

from .models import Cliente, SegmentoCliente


class SegmentoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SegmentoCliente
        fields = ["id", "nombre"]


class ClienteSerializer(serializers.ModelSerializer):
    segmento_nombre = serializers.CharField(source="segmento.nombre", read_only=True)

    class Meta:
        model = Cliente
        fields = [
            "id",
            "nombre",
            "codigo_cliente",
            "ciudad",
            "fecha_registro",
            "limite_credito",
            "segmento",
            "segmento_nombre",
        ]
