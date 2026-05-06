from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClienteViewSet, SegmentoClienteViewSet

router = DefaultRouter()
router.register(r"segmentos", SegmentoClienteViewSet, basename="segmento")
router.register(r"clientes", ClienteViewSet, basename="cliente")

urlpatterns = [
    path("", include(router.urls)),
]
