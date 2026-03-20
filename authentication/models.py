from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrador'),
        ('noc', 'NOC'),
        ('tecnico', 'Tecnico'),
        ('convidado', 'Convidado'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='convidado')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    can_delete = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=True)
    can_create = models.BooleanField(default=True)
    can_access_terminal = models.BooleanField(default=False)
    can_access_backups = models.BooleanField(default=True)
    can_access_integrations = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"
    
    def save(self, *args, **kwargs):
        if self.role == 'admin':
            self.can_delete, self.can_edit, self.can_create = True, True, True
            self.can_access_terminal, self.can_access_integrations = True, True
        elif self.role == 'noc':
            self.can_delete, self.can_edit, self.can_create = False, True, True
            self.can_access_terminal, self.can_access_integrations = True, True
        elif self.role == 'tecnico':
            self.can_delete, self.can_edit, self.can_create = False, True, False
            self.can_access_terminal, self.can_access_integrations = True, True
        else:
            self.can_delete, self.can_edit, self.can_create = False, False, False
            self.can_access_terminal, self.can_access_integrations = False, False
        super().save(*args, **kwargs)

class ExternalSystemUser(models.Model):
    SYSTEM_CHOICES = [
        ('librenms', 'LibreNMS'),
        ('phpipam', 'phpIPAM'),
        ('zabbix', 'Zabbix'),
        ('grafana', 'Grafana'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='external_accounts')
    system = models.CharField(max_length=20, choices=SYSTEM_CHOICES)
    external_username = models.CharField(max_length=100)
    external_user_id = models.CharField(max_length=100, blank=True)
    sync_status = models.CharField(max_length=20, default='pending')
    last_sync = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    class Meta:
        unique_together = ['user', 'system']
