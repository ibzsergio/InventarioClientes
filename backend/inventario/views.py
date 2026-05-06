from rest_framework import viewsets

from .models import Cliente, SegmentoCliente
from .serializers import ClienteSerializer, SegmentoClienteSerializer


class SegmentoClienteViewSet(viewsets.ModelViewSet):
    queryset = SegmentoCliente.objects.all()
    serializer_class = SegmentoClienteSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.select_related("segmento").all()
    serializer_class = ClienteSerializer
