from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Cliente, SegmentoCliente


class ModeloClienteTest(TestCase):
    def setUp(self):
        self.seg = SegmentoCliente.objects.create(nombre="PyME")

    def test_crear_cliente_con_tipos(self):
        c = Cliente.objects.create(
            nombre="Distribuidora Norte",
            codigo_cliente="CLI-001",
            ciudad="Monterrey",
            fecha_registro=date(2025, 1, 15),
            limite_credito=50000,
            segmento=self.seg,
        )
        self.assertEqual(c.ciudad, "Monterrey")
        self.assertEqual(c.limite_credito, 50000)
        self.assertEqual(c.fecha_registro, date(2025, 1, 15))
        self.assertEqual(c.segmento_id, self.seg.pk)


class APIInventarioTest(APITestCase):
    def setUp(self):
        self.seg = SegmentoCliente.objects.create(nombre="Corporativo")
        self.cli = Cliente.objects.create(
            nombre="Acme SA",
            codigo_cliente="ACM-77",
            ciudad="CDMX",
            fecha_registro=date(2024, 6, 1),
            limite_credito=120000,
            segmento=self.seg,
        )

    def test_listado_clientes(self):
        url = reverse("cliente-list")
        r = self.client.get(url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(r.data), 1)

    def test_crear_segmento_y_cliente(self):
        seg_url = reverse("segmento-list")
        r_seg = self.client.post(seg_url, {"nombre": "Retail"}, format="json")
        self.assertEqual(r_seg.status_code, status.HTTP_201_CREATED)
        seg_id = r_seg.data["id"]

        cli_url = reverse("cliente-list")
        payload = {
            "nombre": "Tienda Central",
            "codigo_cliente": "RZ-902",
            "ciudad": "Guadalajara",
            "fecha_registro": "2026-03-10",
            "limite_credito": 8500,
            "segmento": seg_id,
        }
        r = self.client.post(cli_url, payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Cliente.objects.filter(codigo_cliente="RZ-902").count(), 1)

    def test_actualizar_y_eliminar_cliente(self):
        detail = reverse("cliente-detail", kwargs={"pk": self.cli.pk})
        r = self.client.patch(
            detail, {"limite_credito": 200000}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.cli.refresh_from_db()
        self.assertEqual(self.cli.limite_credito, 200000)

        r_del = self.client.delete(detail)
        self.assertEqual(r_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Cliente.objects.filter(pk=self.cli.pk).exists())
