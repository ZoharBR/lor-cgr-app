from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.api_chat, name='ai_chat'),
    path('sessions/', views.api_list_sessions, name='ai_sessions'),
    path('sessions/<str:session_id>/', views.api_get_session, name='ai_session_detail'),
    path('sessions/<str:session_id>/delete/', views.api_delete_session, name='ai_session_delete'),
    path('tools/', views.api_list_tools, name='ai_tools'),
]
