from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def api_health(_request):
    return JsonResponse({"ok": True})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", api_health),
    path("api/", include("inventario.urls")),
]
