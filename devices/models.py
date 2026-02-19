from django.db import models

class Device(models.Model):
    # Identificação & Hardware (Discovery)
    name = models.CharField(max_length=100) # Hostname Real
    ip = models.GenericIPAddressField()
    vendor = models.CharField(max_length=50, default='Huawei')
    model = models.CharField(max_length=100, blank=True, null=True) # Hardware
    os_version = models.CharField(max_length=100, blank=True, null=True) # Operating System
    serial_number = models.CharField(max_length=100, blank=True, null=True) # Serial
    
    # Acessos & Links
    username = models.CharField(max_length=100, blank=True)
    password = models.CharField(max_length=100, blank=True)
    port = models.IntegerField(default=22) # PORTA SSH/TELNET
    protocol = models.CharField(max_length=10, default='SSH')
    web_url = models.CharField(max_length=255, blank=True, null=True) # URL Proxy
    librenms_id = models.IntegerField(blank=True, null=True)

    # Monitoramento SNMP
    snmp_community = models.CharField(max_length=100, default='Visiononline1')
    snmp_port = models.IntegerField(default=161)
    snmp_version = models.CharField(max_length=10, default='v2c')

    # Backup Automático & Funções
    is_bras = models.BooleanField(default=False)
    backup_enabled = models.BooleanField(default=True)
    backup_frequency = models.CharField(max_length=20, default='daily')
    backup_time = models.TimeField(default='03:00')
    
    # Status
    is_online = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.name

class TerminalSession(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    user = models.CharField(max_length=100, default='Unknown')
    start_time = models.DateTimeField(auto_now_add=True)
    log_content = models.TextField(blank=True, default="")

class DeviceBackup(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    file_path = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20)

class DeviceHistory(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=50, default='SYSTEM')
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class InterfaceData(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    interface_name = models.CharField(max_length=100)
    traffic_in = models.BigIntegerField(default=0)
    traffic_out = models.BigIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

class TerminalLog(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    command = models.TextField(default='legacy_command')
    output = models.TextField(default='legacy_output')
    executed_at = models.DateTimeField(auto_now_add=True)
