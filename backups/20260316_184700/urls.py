from django.urls import path
from . import views_simple

urlpatterns = [
    path("list/", views_simple.api_list_devices, name="api_list_devices"),
    path("save/", views_simple.api_save_device, name="api_save_device"),
    path("delete/", views_simple.api_delete_device, name="api_delete_device"),
    path("dashboard/", views_simple.api_dashboard_stats, name="api_dashboard_stats"),
    path("interfaces/stats/", views_simple.api_interfaces_stats, name="api_interfaces_stats"),
    path("device-types/", views_simple.api_device_types, name="api_device_types"),
    path("discovery/", views_simple.api_discovery, name="api_discovery"),
    path("icmp/check/", views_simple.api_icmp_check, name="api_icmp_check"),
    path("icmp/check/<int:device_id>/", views_simple.api_icmp_check, name="api_icmp_check_device"),
    path("backup/list/", views_simple.api_backup_list, name="api_backup_list"),
    path("backup/run/", views_simple.api_backup_run, name="api_backup_run"),
    path("audit-logs/", views_simple.api_audit_logs, name="api_audit_logs"),
]
