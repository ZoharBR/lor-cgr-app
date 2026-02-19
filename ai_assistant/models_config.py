from django.db import models
from django.contrib.auth.models import User

class AIProvider(models.Model):
    """Provedores de IA disponíveis"""
    PROVIDER_CHOICES = [
        ('anthropic', 'Anthropic (Claude)'),
        ('openai', 'OpenAI (GPT-4)'),
        ('google', 'Google (Gemini)'),
        ('cohere', 'Cohere'),
        ('local', 'LLM Local (Ollama)'),
    ]
    
    name = models.CharField(max_length=50, choices=PROVIDER_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=False)
    api_key = models.CharField(max_length=500, blank=True)
    api_url = models.URLField(blank=True, null=True)
    model_name = models.CharField(max_length=100, blank=True)
    
    # Configurações avançadas
    max_tokens = models.IntegerField(default=4000)
    temperature = models.FloatField(default=0.7)
    
    # Dependências Python
    required_packages = models.JSONField(default=list, blank=True)
    packages_installed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Provedor de IA"
        verbose_name_plural = "Provedores de IA"
    
    def __str__(self):
        return f"{self.display_name} {'(Ativo)' if self.is_active else ''}"

class SystemSettings(models.Model):
    """Configurações globais do sistema"""
    active_ai_provider = models.ForeignKey(
        AIProvider, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='active_for_system'
    )
    enable_ai_assistant = models.BooleanField(default=True)
    enable_streaming = models.BooleanField(default=True)
    
    # Integrações
    librenms_url = models.URLField(blank=True, null=True)
    librenms_token = models.CharField(max_length=500, blank=True)
    phpipam_url = models.URLField(blank=True, null=True)
    phpipam_token = models.CharField(max_length=500, blank=True)
    
    class Meta:
        verbose_name = "Configurações do Sistema"
        verbose_name_plural = "Configurações do Sistema"
    
    def save(self, *args, **kwargs):
        # Garantir que só exista uma instância
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def get_instance(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

class UserPreferences(models.Model):
    """Preferências do usuário"""
    THEME_CHOICES = [
        ('dark-blue', 'Azul Escuro (Padrão)'),
        ('dark-purple', 'Roxo Escuro'),
        ('dark-green', 'Verde Escuro'),
        ('cyberpunk', 'Cyberpunk (Neon)'),
        ('minimalist', 'Minimalista Claro'),
        ('nord', 'Nord (Azul Gelo)'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    theme = models.CharField(max_length=50, choices=THEME_CHOICES, default='dark-blue')
    dashboard_layout = models.JSONField(default=dict, blank=True)
    
    # Preferências de IA
    ai_streaming_enabled = models.BooleanField(default=True)
    ai_show_tool_calls = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Preferências do Usuário"
        verbose_name_plural = "Preferências dos Usuários"
