from django.db import models


class Device(models.Model):
    # --- CATEGORIAS POR VENDOR ---
    VENDOR_HUAWEI = 'Huawei'
    VENDOR_MIKROTIK = 'Mikrotik'
    VENDOR_FIBERHOME = 'FiberHome'
    VENDOR_JUNIPER = 'Juniper'
    VENDOR_CISCO = 'Cisco'
    VENDOR_TP_LINK = 'TP-Link'
    VENDOR_UBIQUITI = 'Ubiquiti'
    VENDOR_FORTINET = 'Fortinet'
    VENDOR_HP_ARUBA = 'HP/Aruba'
    VENDOR_DELL = 'Dell'
    VENDOR_LINUX = 'Linux'
    VENDOR_WINDOWS = 'Windows'
    VENDOR_OUTRO = 'Outro'
    
    VENDOR_CHOICES = [
        (VENDOR_HUAWEI, 'Huawei'),
        (VENDOR_MIKROTIK, 'Mikrotik'),
        (VENDOR_FIBERHOME, 'FiberHome'),
        (VENDOR_JUNIPER, 'Juniper'),
        (VENDOR_CISCO, 'Cisco'),
        (VENDOR_TP_LINK, 'TP-Link'),
        (VENDOR_UBIQUITI, 'Ubiquiti'),
        (VENDOR_FORTINET, 'Fortinet'),
        (VENDOR_HP_ARUBA, 'HP/Aruba'),
        (VENDOR_DELL, 'Dell'),
        (VENDOR_LINUX, 'Linux'),
        (VENDOR_WINDOWS, 'Windows'),
        (VENDOR_OUTRO, 'Outro'),
    ]
    
    # Tipos de equipamento
    TYPE_OLT = 'OLT'
    TYPE_SWITCH = 'Switch'
    TYPE_ROUTER = 'Router'
    TYPE_CONCENTRATOR = 'Concentrador'
    TYPE_CGNAT = 'CGNAT'
    TYPE_ONU = 'ONU'
    TYPE_ONT = 'ONT'
    TYPE_WIRELESS = 'Wireless'
    TYPE_SERVER = 'Server'
    TYPE_OTHER = 'Outro'
    
    TYPE_CHOICES = [
        (TYPE_OLT, 'OLT'),
        (TYPE_SWITCH, 'Switch'),
        (TYPE_ROUTER, 'Router'),
        (TYPE_CONCENTRATOR, 'Concentrador (BNG/BRAS/PPPoE)'),
        (TYPE_CGNAT, 'CGNAT'),
        (TYPE_ONU, 'ONU'),
        (TYPE_ONT, 'ONT'),
        (TYPE_WIRELESS, 'Wireless'),
        (TYPE_SERVER, 'Server'),
        (TYPE_OTHER, 'Outro'),
    ]
    
    # Status ICMP
    ICMP_ONLINE = 'online'
    ICMP_WARNING = 'warning'
    ICMP_OFFLINE = 'offline'
    ICMP_UNKNOWN = 'unknown'
    
    ICMP_STATUS_CHOICES = [
        (ICMP_ONLINE, 'Online'),
        (ICMP_WARNING, 'Warning'),
        (ICMP_OFFLINE, 'Offline'),
        (ICMP_UNKNOWN, 'Unknown'),
    ]
    
    # Campos básicos
    name = models.CharField(max_length=100)
    ip = models.GenericIPAddressField()
    vendor = models.CharField(max_length=50, default='Huawei', choices=VENDOR_CHOICES)
    device_type = models.CharField(max_length=30, default='Router', choices=TYPE_CHOICES)
    model = models.CharField(max_length=100, blank=True, null=True)
    os_version = models.CharField(max_length=100, blank=True, null=True)
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    
    # Acesso
    username = models.CharField(max_length=100, blank=True)
    password = models.CharField(max_length=100, blank=True)
    port = models.IntegerField(default=22)
    protocol = models.CharField(max_length=10, default='SSH')
    web_url = models.CharField(max_length=255, blank=True, null=True)
    
    # LibreNMS
    librenms_id = models.IntegerField(blank=True, null=True)
    
    # SNMP
    snmp_community = models.CharField(max_length=100, default='Visiononline1')
    snmp_port = models.IntegerField(default=161)
    snmp_version = models.CharField(max_length=10, default='v2c')
    
    # Classificações
    is_bras = models.BooleanField(default=False)
    
    # Backup
    backup_enabled = models.BooleanField(default=True)
    backup_frequency = models.CharField(max_length=20, default='daily')
    backup_time = models.TimeField(default='03:00')
    
    # Status ICMP
    is_online = models.BooleanField(default=False)
    icmp_status = models.CharField(max_length=20, default='unknown', choices=ICMP_STATUS_CHOICES)
    icmp_latency = models.FloatField(default=0)
    icmp_packet_loss = models.FloatField(default=0)
    last_icmp_check = models.DateTimeField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    def get_status_color(self):
        if self.icmp_status == self.ICMP_ONLINE:
            return 'green'
        elif self.icmp_status == self.ICMP_WARNING:
            return 'orange'
        elif self.icmp_status == self.ICMP_OFFLINE:
            return 'red'
        return 'gray'
    
    @classmethod
    def get_vendor_types(cls, vendor):
        vendor_types = {
            cls.VENDOR_HUAWEI: [cls.TYPE_OLT, cls.TYPE_SWITCH, cls.TYPE_ROUTER, cls.TYPE_CONCENTRATOR, cls.TYPE_CGNAT],
            cls.VENDOR_MIKROTIK: [cls.TYPE_SWITCH, cls.TYPE_ROUTER, cls.TYPE_CONCENTRATOR, cls.TYPE_CGNAT, cls.TYPE_WIRELESS],
            cls.VENDOR_FIBERHOME: [cls.TYPE_OLT, cls.TYPE_ONU, cls.TYPE_ONT],
            cls.VENDOR_JUNIPER: [cls.TYPE_ROUTER, cls.TYPE_CONCENTRATOR, cls.TYPE_SWITCH],
            cls.VENDOR_TP_LINK: [cls.TYPE_OLT, cls.TYPE_ROUTER, cls.TYPE_SWITCH, cls.TYPE_ONU, cls.TYPE_ONT],
            cls.VENDOR_CISCO: [cls.TYPE_SWITCH, cls.TYPE_ROUTER, cls.TYPE_CONCENTRATOR],
            cls.VENDOR_UBIQUITI: [cls.TYPE_WIRELESS, cls.TYPE_SWITCH, cls.TYPE_ROUTER],
            cls.VENDOR_FORTINET: [cls.TYPE_ROUTER, cls.TYPE_CGNAT],
            cls.VENDOR_HP_ARUBA: [cls.TYPE_SWITCH, cls.TYPE_ROUTER],
            cls.VENDOR_DELL: [cls.TYPE_SWITCH],
            cls.VENDOR_LINUX: [cls.TYPE_SERVER, cls.TYPE_ROUTER, cls.TYPE_CONCENTRATOR],
            cls.VENDOR_WINDOWS: [cls.TYPE_SERVER],
            cls.VENDOR_OUTRO: [cls.TYPE_OTHER],
        }
        return vendor_types.get(vendor, [cls.TYPE_OTHER])


class DeviceInterface(models.Model):
    """Interfaces de rede dos dispositivos - dados do LibreNMS"""
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='interfaces')
    if_index = models.IntegerField()
    if_name = models.CharField(max_length=100)
    if_alias = models.CharField(max_length=255, blank=True, null=True)
    if_descr = models.TextField(blank=True, null=True)
    if_admin_status = models.CharField(max_length=20, default='down')
    if_oper_status = models.CharField(max_length=20, default='down')
    if_speed = models.BigIntegerField(default=0)
    if_mtu = models.IntegerField(default=1500)
    if_type = models.CharField(max_length=50, blank=True, null=True)
    traffic_in = models.BigIntegerField(default=0)
    traffic_out = models.BigIntegerField(default=0)
    has_gbic = models.BooleanField(default=False)
    gbic_type = models.CharField(max_length=100, blank=True, null=True)
    gbic_vendor = models.CharField(max_length=100, blank=True, null=True)
    gbic_part_number = models.CharField(max_length=100, blank=True, null=True)
    gbic_serial = models.CharField(max_length=100, blank=True, null=True)
    gbic_wavelength = models.CharField(max_length=50, blank=True, null=True)
    rx_power = models.FloatField(blank=True, null=True)
    tx_power = models.FloatField(blank=True, null=True)
    rx_power_high_alert = models.FloatField(default=-10)
    rx_power_low_alert = models.FloatField(default=-25)
    tx_power_high_alert = models.FloatField(default=-3)
    tx_power_low_alert = models.FloatField(default=-10)
    librenms_port_id = models.IntegerField(blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['device', 'if_index']
        ordering = ['if_name']
    
    def __str__(self):
        return f"{self.device.name} - {self.if_name}"


class ICMPCheckHistory(models.Model):
    """Historico de verificacoes ICMP"""
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='icmp_history')
    timestamp = models.DateTimeField(auto_now_add=True)
    packets_sent = models.IntegerField(default=5)
    packets_received = models.IntegerField(default=0)
    packet_loss = models.FloatField(default=0)
    min_latency = models.FloatField(default=0)
    avg_latency = models.FloatField(default=0)
    max_latency = models.FloatField(default=0)
    status = models.CharField(max_length=20)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.device.name} - {self.timestamp} - {self.status}"


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
