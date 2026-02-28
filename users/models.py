from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)

ROLE_CHOICES = [
    ('admin', 'Admin - Acesso Total'),
    ('noc', 'NOC - Operacional'),
    ('leitura', 'Leitura - Somente Visualizar'),
]

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField('Nivel de Acesso', max_length=20, choices=ROLE_CHOICES, default='leitura')
    librenms_user_id = models.IntegerField(null=True, blank=True)
    phpipam_user_id = models.IntegerField(null=True, blank=True)
    phone = models.CharField('Telefone', max_length=20, blank=True, null=True)
    department = models.CharField('Departamento', max_length=100, blank=True, null=True)
    receive_alerts = models.BooleanField('Receber alertas', default=True)
    dashboard_layout = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Perfil de Usuario'
        verbose_name_plural = 'Perfis de Usuarios'
    
    def __str__(self):
        return 'Perfil de ' + self.user.username
    
    def is_admin(self):
        return self.role == 'admin'
    
    def is_noc(self):
        return self.role == 'noc'
    
    def is_readonly(self):
        return self.role == 'leitura'
    
    def can_delete(self):
        return self.role == 'admin'
    
    def can_edit(self):
        return self.role in ['admin', 'noc']

class UserAccessLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='access_logs')
    username = models.CharField('Usuario', max_length=150)
    action = models.CharField('Acao', max_length=100)
    description = models.TextField('Descricao', blank=True)
    ip_address = models.GenericIPAddressField('IP', null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Log de Acesso'
        verbose_name_plural = 'Logs de Acesso'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.username + ' - ' + self.action

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)
        UserAccessLog.objects.create(user=instance, username=instance.username, action='user_created', description='Usuario criado via LOR CGR')

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

@receiver(pre_delete, sender=User)
def log_user_deletion(sender, instance, **kwargs):
    UserAccessLog.objects.create(user=None, username=instance.username, action='user_deleted', description='Usuario removido do sistema')
