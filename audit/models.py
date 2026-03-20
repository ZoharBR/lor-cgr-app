from django.db import models
from devices.models import Device

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('SSH_CONNECT', 'Conexao SSH'),
        ('SSH_DISCONNECT', 'Desconexao SSH'),
        ('COMMAND', 'Comando Executado'),
        ('BACKUP', 'Backup'),
        ('DEVICE_ADD', 'Dispositivo Adicionado'),
        ('DEVICE_UPDATE', 'Dispositivo Atualizado'),
        ('DEVICE_DELETE', 'Dispositivo Removido'),
        ('DEVICE_ONLINE', 'Dispositivo Online'),
        ('DEVICE_OFFLINE', 'Dispositivo Offline'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
    ]
    
    user = models.CharField(max_length=100, default='system')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    device = models.CharField(max_length=100, blank=True, null=True)
    device_id = models.IntegerField(blank=True, null=True)
    details = models.TextField()
    ip_address = models.CharField(max_length=50, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        managed = False

class TerminalSession(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, null=True, blank=True, related_name='audit_sessions')
    user = models.CharField(max_length=100, default='Unknown')
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(blank=True, null=True)
    log_content = models.TextField(blank=True, default='')
    ip_address = models.CharField(max_length=50, blank=True, default='')
    
    class Meta:
        db_table = 'terminal_sessions'
        ordering = ['-start_time']
        managed = False
