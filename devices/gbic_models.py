from django.db import models
from django.contrib.auth.models import User
from devices.models import DeviceInterface

class GBICAlarmConfig(models.Model):
    """Configuracao de alarmes por GBIC"""
    interface = models.OneToOneField(DeviceInterface, on_delete=models.CASCADE, related_name='alarm_config')
    temp_warning = models.FloatField(default=45.0)
    temp_critical = models.FloatField(default=60.0)
    rx_warning = models.FloatField(default=-20.0)
    rx_critical = models.FloatField(default=-25.0)
    tx_warning = models.FloatField(default=0.0)
    tx_critical = models.FloatField(default=-5.0)
    rx_variation_alert = models.FloatField(default=5.0, help_text="Alertar se RX variar mais que X dB")
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'devices_gbic_alarm_config'
        verbose_name = 'Configuracao de Alarme GBIC'
    
    def __str__(self):
        return f"Alarm {self.interface}"

class UserMonitoredGBIC(models.Model):
    """GBICs que o usuario quer monitorar"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    interface = models.ForeignKey(DeviceInterface, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'devices_user_monitored_gbic'
        unique_together = ['user', 'interface']
        verbose_name = 'GBIC Monitorado pelo Usuario'
    
    def __str__(self):
        return f"{self.user.username} - {self.interface}"
