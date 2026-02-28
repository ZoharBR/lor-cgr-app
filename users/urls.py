from django.urls import path
from . import views
from . import views_auth

urlpatterns = [
    # Autenticação
    path('auth/check/', views_auth.check_auth, name='api_check_auth'),
    path('auth/login/', views_auth.login_view, name='api_login'),
    path('auth/logout/', views_auth.logout_view, name='api_logout'),
    path('auth/csrf/', views_auth.get_csrf, name='api_csrf'),
    
    # Usuários
    path('users/', views.api_list_users, name='api_list_users'),
    path('users/create/', views.api_create_user, name='api_create_user'),
    path('users/<int:user_id>/', views.api_get_user, name='api_get_user'),
    path('users/<int:user_id>/update/', views.api_update_user, name='api_update_user'),
    path('users/<int:user_id>/delete/', views.api_delete_user, name='api_delete_user'),
    path('users/<int:user_id>/password/', views.api_change_password, name='api_change_password'),
    
    # Logs
    path('logs/', views.api_list_logs, name='api_list_logs'),
    path('logs/<int:log_id>/', views.api_get_log_detail, name='api_log_detail'),
    path('logs/<int:log_id>/delete/', views.api_delete_log, name='api_delete_log'),
    path('logs/clear/', views.api_clear_logs, name='api_clear_logs'),
    path('logs/export/', views.api_export_logs, name='api_export_logs'),
]
