from django.db import models


class Device(models.Model):
    name = models.CharField(max_length=100)
    ip = models.GenericIPAddressField()
    vendor = models.CharField(max_length=50, default='Huawei')
    model = models.CharField(max_length=100, blank=True, null=True)
    os_version = models.CharField(max_length=100, blank=True, null=True)
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    username = models.CharField(max_length=100, blank=True)
    password = models.CharField(max_length=100, blank=True)
    port = models.IntegerField(default=22)
    protocol = models.CharField(max_length=10, default='SSH')
    web_url = models.CharField(max_length=255, blank=True, null=True)
    librenms_id = models.IntegerField(blank=True, null=True)
    snmp_community = models.CharField(max_length=100, default='Visiononline1')
    snmp_port = models.IntegerField(default=161)
    snmp_version = models.CharField(max_length=10, default='v2c')
    is_bras = models.BooleanField(default=False)
    backup_enabled = models.BooleanField(default=True)
    backup_frequency = models.CharField(max_length=20, default='daily')
    backup_time = models.TimeField(default='03:00')
    is_online = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


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


class MassCommandScript(models.Model):
    VENDOR_CHOICES = [
        ('all', 'Todos'),
        ('Mikrotik', 'Mikrotik'),
        ('Huawei', 'Huawei'),
        ('Juniper', 'Juniper'),
        ('FiberHome', 'FiberHome OLT'),
        ('Linux', 'Linux/Ubuntu/Debian'),
        ('Windows', 'Windows Server'),
    ]
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    vendor = models.CharField(max_length=50, choices=VENDOR_CHOICES, default='all')
    commands = models.TextField()
    variables = models.JSONField(default=dict, blank=True)
    timeout = models.IntegerField(default=30)
    created_by = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name


class MassCommandExecution(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('running', 'Executando'),
        ('completed', 'Concluido'),
        ('partial', 'Parcial'),
        ('failed', 'Falhou'),
    ]
    script = models.ForeignKey(MassCommandScript, on_delete=models.CASCADE, related_name='executions')
    devices = models.ManyToManyField(Device, related_name='command_executions')
    scheduled_at = models.DateTimeField(blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)
    finished_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    triggered_by = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.script.name} - {self.status}"


class MassCommandResult(models.Model):
    execution = models.ForeignKey(MassCommandExecution, on_delete=models.CASCADE, related_name='results')
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    success = models.BooleanField(default=False)
    output = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    execution_time = models.FloatField(default=0)
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['execution', 'device']

    def __str__(self):
        return f"{self.device.name} - {'OK' if self.success else 'ERRO'}"
