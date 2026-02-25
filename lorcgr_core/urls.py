from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('api/ai/', include('ai_assistant.urls')),
    path('api/settings/', include('core_system.api_urls')),
    path('admin/', admin.site.urls),
    # Rotas da API de Dispositivos
    path('devices/', include('devices.urls')),
    # Rota para o React (Qualquer outra URL cai aqui)
    path('', TemplateView.as_view(template_name='index.html')),
]

# Manual do Usuário
from django.views.generic import TemplateView

urlpatterns += [
    path('manual/', TemplateView.as_view(template_name='manual_usuario.html'), name='manual'),
]

# IA Fullscreen
from django.views.generic import TemplateView
urlpatterns += [
    path('ai-chat/', TemplateView.as_view(template_name='ai_fullscreen.html'), name='ai_fullscreen'),
]
