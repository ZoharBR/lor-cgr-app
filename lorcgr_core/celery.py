"""
Configuração do Celery para LORCGR
"""
import os
from celery import Celery
from celery.schedules import crontab

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lorcgr_core.settings')

app = Celery('lorcgr')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ========================================
# SCHEDULE DAS TASKS
# ========================================
app.conf.beat_schedule = {
    # Verificar status a cada 30 segundos
    'check-devices-status': {
        'task': 'devices.tasks.check_devices_status',
        'schedule': 30.0,
    },
    
    # Atualizar info detalhada a cada 5 minutos
    'update-device-info': {
        'task': 'devices.tasks.update_device_info',
        'schedule': 300.0,
    },
    
    # Backup automático às 03:00
    'auto-backup-devices': {
        'task': 'devices.tasks.run_auto_backups',
        'schedule': crontab(hour=3, minute=0),
    },
}

# Configurações gerais
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Sao_Paulo',
    enable_utc=True,
)
