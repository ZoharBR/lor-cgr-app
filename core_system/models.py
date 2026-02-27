import uuid
from django.db import models
from django.conf import settings


class SystemSettings(models.Model):
    cpu_warning_threshold = models.IntegerField(default=80)
    cpu_critical_threshold = models.IntegerField(default=95)
    pppoe_drop_alert = models.IntegerField(default=50)
    ping_timeout = models.IntegerField(default=2)
    telegram_enabled = models.BooleanField(default=False)
    telegram_bot_token = models.CharField(max_length=200, blank=True)
    telegram_chat_id = models.CharField(max_length=100, blank=True)
    keep_logs_days = models.IntegerField(default=30)
    keep_backups_days = models.IntegerField(default=90)
    system_name = models.CharField(max_length=50, default="LOR CGR")
    maintenance_mode = models.BooleanField(default=False)
    librenms_enabled = models.BooleanField(default=True)
    librenms_url = models.CharField(max_length=255, default="http://localhost:8081")
    librenms_api_token = models.CharField(max_length=100, blank=True)
    phpipam_enabled = models.BooleanField(default=True)
    phpipam_url = models.CharField(max_length=255, default="http://localhost:9100")
    phpipam_app_id = models.CharField(max_length=50, blank=True)
    phpipam_app_key = models.CharField(max_length=100, blank=True)
    phpipam_user = models.CharField(max_length=50, blank=True)
    phpipam_password = models.CharField(max_length=100, blank=True)
    ai_enabled = models.BooleanField(default=True)
    ai_provider = models.CharField(max_length=50, default="groq")
    groq_api_key = models.CharField(max_length=200, blank=True)
    groq_model = models.CharField(max_length=100, default="llama-3.3-70b-versatile")
    ai_temperature = models.FloatField(default=0.7)
    ai_max_tokens = models.IntegerField(default=4096)
    ai_system_prompt = models.TextField(default="Voce e um assistente especializado em redes e infraestrutura de TI.")
    git_enabled = models.BooleanField(default=False)
    git_repo_url = models.CharField(max_length=255, blank=True)
    git_branch = models.CharField(max_length=50, default="main")
    git_auto_backup = models.BooleanField(default=False)
    git_backup_frequency = models.CharField(max_length=20, default="daily")

    def __str__(self):
        return "Configuracoes"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=200, blank=True, default="Nova Conversa")
    context = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-updated_at"]
    
    def __str__(self):
        return self.title


class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ("user", "Usuario"),
        ("assistant", "Assistente"),
        ("system", "Sistema"),
        ("tool", "Ferramenta"),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    tool_name = models.CharField(max_length=100, blank=True, null=True)
    tool_args = models.JSONField(blank=True, null=True)
    tool_result = models.JSONField(blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ["created_at"]
    
    def __str__(self):
        return f"{self.role}: {self.content[:30]}..."
