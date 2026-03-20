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
    
    # Campos básicos
    name = models.CharField(max_length=255)
    ip = models.GenericIPAddressField()
    vendor = models.CharField(max_length=100, blank=True, null=True)
    device_type = models.CharField(max_length=30, default='Router', choices=TYPE_CHOICES)
    model = models.CharField(max_length=100, blank=True, null=True)
    is_online = models.BooleanField(default=False)
    
    # Acesso básico
    protocol = models.CharField(max_length=20, default='ssh')
    port = models.IntegerField(default=22)
    username = models.CharField(max_length=100, blank=True, null=True)
    password = models.CharField(max_length=255, blank=True, null=True)
    
    # SSH específico
    ssh_user = models.CharField(max_length=255, blank=True, null=True)
    ssh_password = models.CharField(max_length=255, blank=True, null=True)
    ssh_port = models.IntegerField(default=22)
    ssh_version = models.CharField(max_length=50, default='2')
    
    # Telnet
    telnet_enabled = models.BooleanField(default=False)
    telnet_port = models.IntegerField(default=23)
    
    # SNMP
    snmp_community = models.CharField(max_length=100, blank=True, null=True)
    snmp_port = models.IntegerField(default=161)
    snmp_version = models.CharField(max_length=10, default='v2c')
    
    # Classificações
    is_bras = models.BooleanField(default=False)
    
    # Backup
    backup_enabled = models.BooleanField(default=True)
    backup_method = models.CharField(max_length=50, default='ssh')
    backup_frequency = models.CharField(max_length=20, default='daily')
    backup_time = models.TimeField(default='03:00')
    last_backup = models.DateTimeField(blank=True, null=True)
    
    # Localização
    location = models.CharField(max_length=255, blank=True, null=True)
    
    # Status ICMP
    icmp_status = models.CharField(max_length=20, default='unknown')
    icmp_latency = models.FloatField(default=0)
    icmp_packet_loss = models.FloatField(default=0)
    last_icmp_check = models.DateTimeField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'devices'

    def __str__(self):
        return self.name


class DeviceInterface(models.Model):
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
    rx_power = models.FloatField(blank=True, null=True)
    tx_power = models.FloatField(blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'device_interfaces'
        unique_together = ['device', 'if_index']

    def __str__(self):
        return f"{self.device.name} - {self.if_name}"


class TerminalSession(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    user = models.CharField(max_length=100, default='Unknown')
    start_time = models.DateTimeField(auto_now_add=True)
    log_content = models.TextField(blank=True, default="")
    
    class Meta:
        db_table = 'terminal_sessions'


class TerminalLog(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    command = models.TextField(default='legacy_command')
    output = models.TextField(default='legacy_output')
    executed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'terminal_logs'


class DeviceBackup(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    file_path = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20)
    
    class Meta:
        db_table = 'backups'


class DeviceHistory(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=50, default='SYSTEM')
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'device_history'


class InterfaceData(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    interface_name = models.CharField(max_length=100)
    traffic_in = models.BigIntegerField(default=0)
    traffic_out = models.BigIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'interface_data'
