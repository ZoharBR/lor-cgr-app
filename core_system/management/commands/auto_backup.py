from django.core.management.base import BaseCommand
from django.utils import timezone
from devices.models import Device
from core_system.backup_engine import run_device_backup
import datetime

class Command(BaseCommand):
    help = 'Executa backups agendados'

    def handle(self, *args, **kwargs):
        now = timezone.localtime()
        current_hour = now.strftime('%H:00')
        
        # Filtra dispositivos com backup automático ativado para esta hora
        # Nota: Convertemos a hora para string para comparar apenas a hora cheia
        devices = Device.objects.filter(auto_backup=True)
        
        self.stdout.write(f"[{now}] Iniciando verificação de backups agendados...")
        
        for device in devices:
            # Verifica se a hora de backup coincide com a hora atual
            if device.backup_hour.strftime('%H:00') == current_hour:
                self.stdout.write(f"Executando backup agendado: {device.name}")
                success, msg = run_device_backup(device.id)
                status = "SUCESSO" if success else "ERRO"
                self.stdout.write(f"[{status}] {device.name}: {msg}")

        self.stdout.write("Rotina finalizada.")

