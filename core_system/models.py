from django.db import models

class SystemSettings(models.Model):
    # === 1. MONITORAMENTO ===
    cpu_warning_threshold = models.IntegerField(default=80, verbose_name="Alerta CPU Alta (%)")
    cpu_critical_threshold = models.IntegerField(default=95, verbose_name="Crítico CPU (%)")
    
    pppoe_drop_alert = models.IntegerField(default=50, verbose_name="Alerta Queda PPPoE (Qtd)")
    ping_timeout = models.IntegerField(default=2, verbose_name="Timeout Ping (segundos)")

    # === 2. NOTIFICAÇÕES (TELEGRAM) ===
    telegram_enabled = models.BooleanField(default=False, verbose_name="Ativar Telegram")
    telegram_bot_token = models.CharField(max_length=200, blank=True, verbose_name="Bot Token")
    telegram_chat_id = models.CharField(max_length=100, blank=True, verbose_name="Chat ID")

    # === 3. MANUTENÇÃO (LIMPEZA) ===
    keep_logs_days = models.IntegerField(default=30, verbose_name="Manter Logs por (dias)")
    keep_backups_days = models.IntegerField(default=90, verbose_name="Manter Backups por (dias)")
    
    # === 4. SISTEMA ===
    system_name = models.CharField(max_length=50, default="LOR CGR", verbose_name="Nome do Sistema")
    maintenance_mode = models.BooleanField(default=False, verbose_name="Modo Manutenção")

    def __str__(self):
        return "Configurações Globais"

    # Garante que só exista 1 configuração (ID=1)
    def save(self, *args, **kwargs):
        self.pk = 1
        super(SystemSettings, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
