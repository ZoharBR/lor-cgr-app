from django.urls import path
from . import views

urlpatterns = [
    # Rota da API para o Dashboard NOC
    path('api/noc/huawei/', views.api_dashboard_noc, name='api_noc_huawei'),
]
