from django.urls import path
from . import views
from . import mass_commands_views

urlpatterns = [
    path('api/list/', views.api_list_devices, name='api_list_devices'),
    path('api/save/', views.api_save_device, name='api_save_device'),
    path('api/dashboard/', views.api_dashboard_stats, name='api_dashboard_stats'),
    path('api/discovery/', views.api_run_discovery, name='api_run_discovery'),
    path('api/backup/run/', views.api_run_backup, name='api_run_backup'),
    path('api/backup/list/', views.api_list_backups, name='api_list_backups'),
    path('api/backup/view/', views.api_view_backup, name='api_view_backup'),
    path('api/backup/delete/', views.api_delete_backup, name='api_delete_backup'),
    path('api/backup/bulk/', views.api_backup_bulk_action, name='api_backup_bulk_action'),
    path('proxy/<int:device_id>/', views.api_proxy_web, kwargs={'path': ''}, name='api_proxy_root'),
    path('proxy/<int:device_id>/<path:path>', views.api_proxy_web, name='api_proxy_web'),
    path('api/audit-logs/', views.api_audit_logs, name='api_audit_logs'),
    path('api/terminal-sessions/', views.api_terminal_sessions, name='api_terminal_sessions'),
    path('api/session-log/<int:session_id>/', views.api_session_log, name='api_session_log'),
    path('api/manual/', views.api_get_manual, name='api_get_manual'),
    
    # Mass Commands
    path('api/mass-scripts/', mass_commands_views.list_scripts, name='list_scripts'),
    path('api/mass-scripts/create/', mass_commands_views.create_script, name='create_script'),
    path('api/mass-scripts/<int:script_id>/update/', mass_commands_views.update_script, name='update_script'),
    path('api/mass-scripts/<int:script_id>/delete/', mass_commands_views.delete_script, name='delete_script'),
    path('api/mass-scripts/<int:script_id>/execute/', mass_commands_views.execute_script, name='execute_script'),
    path('api/mass-scripts/<int:script_id>/schedule/', mass_commands_views.schedule_script, name='schedule_script'),
    path('api/mass-devices/', mass_commands_views.list_devices, name='list_mass_devices'),
    path('api/mass-executions/', mass_commands_views.list_executions, name='list_executions'),
    path('api/mass-executions/<int:execution_id>/', mass_commands_views.execution_detail, name='execution_detail'),
    path('api/mass-executions/<int:execution_id>/cancel/', mass_commands_views.cancel_execution, name='cancel_execution'),
]
