from django.contrib import admin
from .models import Device, DeviceBackup, DeviceHistory, InterfaceData, TerminalLog, TerminalSession

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('name', 'ip', 'vendor', 'model', 'is_online')
    search_fields = ('name', 'ip', 'serial_number')

@admin.register(TerminalSession)
class TerminalSessionAdmin(admin.ModelAdmin):
    list_display = ('device', 'user', 'start_time')

admin.site.register(DeviceBackup)
admin.site.register(DeviceHistory)
admin.site.register(InterfaceData)
admin.site.register(TerminalLog)

# Dashboard models
from .dashboard_models import DashboardLayout, DashboardWidget, UserWidgetConfig

admin.site.register(DashboardLayout)
admin.site.register(DashboardWidget)
admin.site.register(UserWidgetConfig)

# GBIC Models
from .gbic_models import GBICAlarmConfig, UserMonitoredGBIC

@admin.register(GBICAlarmConfig)
class GBICAlarmConfigAdmin(admin.ModelAdmin):
    list_display = ['interface', 'temp_warning', 'temp_critical', 'rx_warning', 'rx_critical', 'enabled']
    list_filter = ['enabled']
    search_fields = ['interface__if_name', 'interface__device__name']

@admin.register(UserMonitoredGBIC)
class UserMonitoredGBICAdmin(admin.ModelAdmin):
    list_display = ['user', 'interface', 'created_at']
    list_filter = ['user']
