from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.chat, name='ai_chat'),
    path('conversation/<str:session_id>/', views.get_conversation_history, name='ai_conversation'),
    path('conversations/', views.list_conversations, name='ai_conversations'),
    path('analyze/<int:device_id>/', views.analyze_device, name='ai_analyze_device'),
]

# Configurações
from .views_config import manage_ai_providers, install_ai_packages, test_ai_connection

urlpatterns += [
    path('config/providers/', manage_ai_providers, name='manage_providers'),
    path('config/install/', install_ai_packages, name='install_packages'),
    path('config/test/', test_ai_connection, name='test_connection'),
]

# Frontend fullscreen
from .views_frontend import ai_fullscreen
urlpatterns += [
    path('fullscreen/', ai_fullscreen, name='ai_fullscreen_page'),
]
