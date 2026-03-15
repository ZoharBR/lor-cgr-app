from django.db import models
from django.conf import settings

class DashboardLayout(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dashboard_layout')
    layout_config = models.JSONField(default=dict, blank=True)
    is_customized = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"Dashboard de {self.user.username}"

class DashboardWidget(models.Model):
    WIDGET_TYPES = [
        ('pie_chart', 'Grafico de Pizza'),
        ('bar_chart', 'Grafico de Barras'),
        ('line_chart', 'Grafico de Linha'),
        ('gauge', 'Medidor/Gauge'),
        ('big_number', 'Numero Grande'),
        ('status_card', 'Card de Status'),
        ('power_meter', 'Medidor de Potencia Optica'),
        ('server_health', 'Saude do Servidor'),
        ('table', 'Tabela de Dados'),
        ('ddm_summary', 'Resumo DDM'),
        ('device_status', 'Status de Dispositivo'),
        ('interface_stats', 'Estatisticas de Interface'),
    ]
    widget_id = models.CharField(max_length=50, unique=True)
    widget_type = models.CharField(max_length=30, choices=WIDGET_TYPES)
    title = models.CharField(max_length=100)
    grid_x = models.IntegerField(default=0)
    grid_y = models.IntegerField(default=0)
    grid_w = models.IntegerField(default=2)
    grid_h = models.IntegerField(default=1)
    config = models.JSONField(default=dict, blank=True)
    data_source = models.CharField(max_length=50, blank=True)
    device_filter = models.IntegerField(null=True, blank=True)
    interface_filter = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    refresh_seconds = models.IntegerField(default=60)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['grid_y', 'grid_x']
    def __str__(self):
        return f"{self.title} ({self.widget_type})"

class UserWidgetConfig(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    widget = models.ForeignKey(DashboardWidget, on_delete=models.CASCADE)
    grid_x = models.IntegerField(null=True, blank=True)
    grid_y = models.IntegerField(null=True, blank=True)
    grid_w = models.IntegerField(null=True, blank=True)
    grid_h = models.IntegerField(null=True, blank=True)
    custom_config = models.JSONField(default=dict, blank=True)
    is_visible = models.BooleanField(default=True)
    class Meta:
        unique_together = ['user', 'widget']
    def __str__(self):
        return f"{self.user.username} - {self.widget.title}"
