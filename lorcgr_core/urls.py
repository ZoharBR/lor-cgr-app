from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/ai/', include('ai_assistant.urls')),
    path('api/settings/', include('core_system.api_urls')),
    path('devices/', include('devices.urls')),
    path('manual/', TemplateView.as_view(template_name='manual_usuario.html'), name='manual'),
    path('ai-chat/', TemplateView.as_view(template_name='ai_fullscreen.html'), name='ai_fullscreen'),
    path('', TemplateView.as_view(template_name='index.html')),
]
