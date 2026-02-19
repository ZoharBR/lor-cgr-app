from django.urls import path
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    # Dashboard
    path('', views.home, name='dashboard'),
    
    # Dispositivos
    path('devices/', views.device_list, name='device_list'),
    path('devices/detail/<int:pk>/', views.device_detail, name='device_detail'),
    
    # Ações
    path('devices/discovery/<int:pk>/', views.trigger_discovery, name='trigger_discovery'),
    path('devices/poll/<int:pk>/', views.trigger_update, name='trigger_update'),
    path('devices/backup/<int:pk>/', views.trigger_backup, name='trigger_backup'),

    # CRUD
    path('devices/add/', views.device_add, name='device_add'),
    path('devices/edit/<int:pk>/', views.device_edit, name='device_edit'),
    path('devices/delete/<int:pk>/', views.device_delete, name='device_delete'),

    # === AQUI ESTAVA FALTANDO ===
    path('inventory/', views.inventory_view, name='inventory'),
    # ============================

    # Usuários
    path('users/', views.user_list, name='user_list'),
    path('users/add/', views.user_create, name='user_create'),
    path('users/edit/<int:pk>/', views.user_edit, name='user_edit'),
    path('users/delete/<int:pk>/', views.user_delete, name='user_delete'),

    # Configurações e Ferramentas
    path('settings/', views.settings_view, name='settings_view'),
    path('backups/', views.backup_manager, name='backup_manager'),
    path('terminal/', views.multi_terminal, name='multi_terminal'),
    path('logs/delete/<int:log_id>/', views.delete_terminal_log, name='delete_terminal_log'),

    # Login/Logout
    path('login/', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
]
