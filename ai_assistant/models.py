from django.db import models
from django.contrib.auth.models import User
from devices.models import Device

class Conversation(models.Model):
    """Armazena conversas com a IA"""
    user = models.CharField(max_length=100, default='system')
    session_id = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    context_type = models.CharField(max_length=50, blank=True, null=True)  # device, network, general
    context_id = models.IntegerField(blank=True, null=True)  # ID do device se aplicável
    
    def __str__(self):
        return f"{self.user} - {self.session_id[:8]}"

class Message(models.Model):
    """Armazena mensagens individuais"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20)  # user, assistant, system
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    tokens_used = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.role}: {self.content[:50]}"

class AITask(models.Model):
    """Tarefas executadas pela IA"""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('running', 'Executando'),
        ('completed', 'Concluído'),
        ('failed', 'Falhou'),
    ]
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='tasks')
    task_type = models.CharField(max_length=50)  # config_ospf, backup_device, troubleshoot, etc
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    devices = models.ManyToManyField(Device, blank=True)
    result = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.task_type} - {self.status}"

class DeviceAnalysis(models.Model):
    """Análises de equipamentos feitas pela IA"""
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='ai_analyses')
    analysis_type = models.CharField(max_length=50)  # config, performance, security, health
    findings = models.TextField()  # JSON com descobertas
    recommendations = models.TextField()  # Recomendações da IA
    severity = models.CharField(max_length=20, default='info')  # info, warning, critical
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.device.name} - {self.analysis_type}"

# Importar modelos de configuração
from .models_config import AIProvider, SystemSettings, UserPreferences
