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
