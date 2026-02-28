from django.urls import path
from . import views

urlpatterns = [
    # Usuários
    path('users/', views.api_list_users, name='api_list_users'),
    path('users/create/', views.api_create_user, name='api_create_user'),
    path('users/<int:user_id>/', views.api_get_user, name='api_get_user'),
    path('users/<int:user_id>/update/', views.api_update_user, name='api_update_user'),
    path('users/<int:user_id>/delete/', views.api_delete_user, name='api_delete_user'),
    path('users/<int:user_id>/password/', views.api_change_password, name='api_change_password'),
    
    # Logs
    path('logs/', views.api_list_logs, name='api_list_logs'),
    path('logs/<int:log_id>/delete/', views.api_delete_log, name='api_delete_log'),
    path('logs/clear/', views.api_clear_logs, name='api_clear_logs'),
    path('logs/export/', views.api_export_logs, name='api_export_logs'),
]
