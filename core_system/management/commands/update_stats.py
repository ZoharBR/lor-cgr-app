import json
from django.utils import timezone
from django.core.management.base import BaseCommand
from devices.models import Device
from core_system.utils import get_device_data

class Command(BaseCommand):
    help = 'Coleta estatísticas com verificação de Ping'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        devices = Device.objects.filter(is_active=True)

        for device in devices:
            elapsed = (now - device.last_run).total_seconds() / 60
            if elapsed < device.collection_interval: continue

            try:
                self.stdout.write(f"Coletando: {device.name}...")
                data = get_device_data(device)

                # Salva status Online/Offline PRIMEIRO
                device.is_online = data.get('is_online', False)
                
                # Se estiver online, salva o resto
                if device.is_online:
                    if 'cpu' in data: device.last_cpu = str(data['cpu'])
                    if 'uptime' in data: device.last_uptime = str(data['uptime'])
                    if 'pppoe' in data: device.last_pppoe_count = int(data['pppoe'])
                    if 'model' in data: device.model_name = str(data['model'])
                    if 'version' in data: device.firmware_version = str(data['version'])
                
                device.last_run = now
                device.save()
                
                status_msg = "ONLINE" if device.is_online else "OFFLINE"
                self.stdout.write(self.style.SUCCESS(f"-> {device.name}: {status_msg}"))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"-> Erro: {e}"))
