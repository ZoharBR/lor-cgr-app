from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.api_chat, name='api_ai_chat'),
    path('sessions/', views.api_chat_sessions, name='api_ai_sessions'),
    path('session/<uuid:session_id>/', views.api_chat_session, name='api_ai_session'),
    path('session/<uuid:session_id>/delete/', views.api_chat_session_delete, name='api_ai_session_delete'),
    path('tools/', views.api_tools_list, name='api_ai_tools'),
]
