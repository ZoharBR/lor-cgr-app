from django.urls import path, include
from . import views
from . import mass_commands_views
from . import dashboard_api
from .gbic_api import gbic_list, gbic_monitor_config, gbic_alarm_config, gbic_devices_list

urlpatterns = [
    # Dispositivos
    path("list/", views.api_list_devices, name="api_list_devices"),
    path("save/", views.api_save_device, name="api_save_device"),
    path("dashboard/", views.api_dashboard_stats, name="api_dashboard_stats"),
    path("discovery/", views.api_run_discovery, name="api_run_discovery"),
    
    # ICMP Status
    path("icmp/check/", views.api_icmp_check, name="api_icmp_check_all"),
    path("icmp/check/<int:device_id>/", views.api_icmp_check, name="api_icmp_check"),
    
    # Device Types
    path("device-types/", views.api_device_types, name="api_device_types"),
    path("interfaces/stats/", views.api_interfaces_stats, name="api_interfaces_stats"),
    
    # LibreNMS Sync
    path("librenms/sync/", views.api_librenms_sync, name="api_librenms_sync"),
    path("librenms/sync-interfaces/<int:device_id>/", views.api_sync_interfaces, name="api_sync_interfaces"),
    path("librenms/sync-transceivers/<int:device_id>/", views.api_sync_transceivers, name="api_sync_transceivers"),
    path("librenms/sync-all/<int:device_id>/", views.api_sync_all_interfaces, name="api_sync_all_interfaces"),
    path("librenms/sync-optical/<int:device_id>/", views.api_sync_optical, name="api_sync_optical"),
    path("librenms/sync-ddm/<int:device_id>/", views.api_sync_ddm_sensors, name="api_sync_ddm_sensors"),
    
    # Interfaces
    path("device/<int:device_id>/interfaces/", views.api_device_interfaces, name="api_device_interfaces"),
    
    # Backup
    path("backup/run/", views.api_run_backup, name="api_run_backup"),
    path("backup/list/", views.api_list_backups, name="api_list_backups"),
    path("backup/view/", views.api_view_backup, name="api_view_backup"),
    path("backup/delete/", views.api_delete_backup, name="api_delete_backup"),
    path("backup/bulk/", views.api_backup_bulk_action, name="api_backup_bulk_action"),
    
    # Proxy Web
    path("proxy/<int:device_id>/", views.api_proxy_web, kwargs={"path": ""}, name="api_proxy_root"),
    path("proxy/<int:device_id>/<path:path>", views.api_proxy_web, name="api_proxy_web"),
    
    # Audit e Sessions
    path("audit-logs/", views.api_audit_logs, name="api_audit_logs"),
    path("terminal-sessions/", views.api_terminal_sessions, name="api_terminal_sessions"),
    path("session-log/<int:session_id>/", views.api_session_log, name="api_session_log"),
    path("manual/", views.api_get_manual, name="api_get_manual"),
    
    # Mass Commands
    path("mass-scripts/", mass_commands_views.list_scripts, name="list_scripts"),
    path("mass-scripts/create/", mass_commands_views.create_script, name="create_script"),
    path("mass-scripts/<int:script_id>/update/", mass_commands_views.update_script, name="update_script"),
    path("mass-scripts/<int:script_id>/delete/", mass_commands_views.delete_script, name="delete_script"),
    path("mass-scripts/<int:script_id>/execute/", mass_commands_views.execute_script, name="execute_script"),
    path("mass-scripts/<int:script_id>/schedule/", mass_commands_views.schedule_script, name="schedule_script"),
    path("mass-devices/", mass_commands_views.list_devices, name="list_mass_devices"),
    path("mass-executions/", mass_commands_views.list_executions, name="list_executions"),
    path("mass-executions/<int:execution_id>/", mass_commands_views.execution_detail, name="execution_detail"),
    path("mass-executions/<int:execution_id>/cancel/", mass_commands_views.cancel_execution, name="cancel_execution"),

    # Dashboard Editavel
    path("dashboard/config/", dashboard_api.get_dashboard_config, name="api_dashboard_config"),
    path("dashboard/save/", dashboard_api.save_dashboard_layout, name="api_dashboard_save"),
    path("dashboard/widget/create/", dashboard_api.create_widget, name="api_widget_create"),
    path("dashboard/widget/update/", dashboard_api.update_widget, name="api_widget_update"),
    path("dashboard/widget/delete/", dashboard_api.delete_widget, name="api_widget_delete"),
    path("dashboard/widget/data/", dashboard_api.get_widget_data, name="api_widget_data"),
    path("dashboard/devices/", dashboard_api.get_available_devices, name="api_dashboard_devices"),
    path("dashboard/interfaces/", dashboard_api.get_available_interfaces, name="api_dashboard_interfaces"),
    path("dashboard/reset/", dashboard_api.reset_dashboard, name="api_dashboard_reset"),
    
    # GBIC APIs
    path("gbic/list/", gbic_list, name="gbic_list"),
    path("gbic/devices/", gbic_devices_list, name="gbic_devices"),
    path("gbic/monitor/", gbic_monitor_config, name="gbic_monitor_config"),
    path("gbic/<int:gbic_id>/alarm/", gbic_alarm_config, name="gbic_alarm_config"),
]
