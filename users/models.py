from django.db import models
from django.contrib.auth.models import User

class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    NOC = 'NOC', 'NOC'
    LEITURA = 'LEITURA', 'Leitura'

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=UserRole.choices, default=UserRole.NOC)
    avatar = models.URLField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, default='')
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

class UserAccessLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='access_logs')
    action = models.CharField(max_length=50)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=500, blank=True, null=True)
    metadata = models.JSONField(blank=True, null=True)
    # Campos para SSH
    ssh_command = models.TextField(blank=True, null=True)
    ssh_output = models.TextField(blank=True, null=True)
    ssh_device = models.CharField(max_length=100, blank=True, null=True)
    ssh_success = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.created_at}"
