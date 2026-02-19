from django.core.management.base import BaseCommand
from django.utils import timezone
from devices.models import BackupSchedule
from net_tools.backup_engine import BackupEngine
import datetime

class Command(BaseCommand):
    help = 'Verifica agendamentos e executa backups pendentes'

    def handle(self, *args, **kwargs):
        now = timezone.localtime(timezone.now())
        current_time = now.time().replace(second=0, microsecond=0)
        current_weekday = str(now.strftime('%w')) # 0=Domingo
        current_day = now.day

        # Busca agendamentos ativos para este horario
        schedules = BackupSchedule.objects.filter(is_active=True, time__hour=current_time.hour, time__minute=current_time.minute)

        for sched in schedules:
            should_run = False
            
            # Logica de Frequencia
            if sched.frequency == 'daily':
                should_run = True
            elif sched.frequency == 'weekly':
                if current_weekday in sched.days_week.split(','):
                    should_run = True
            elif sched.frequency == 'monthly':
                if sched.day_month == current_day:
                    should_run = True

            if should_run:
                self.stdout.write(self.style.SUCCESS(f"[SCHEDULER] Executando rotina: {sched.name}"))
                
                # Executa para cada dispositivo da lista
                for device in sched.devices.filter(is_active=True):
                    self.stdout.write(f" -> Iniciando backup: {device.name} ({device.ip_address})")
                    engine = BackupEngine(device)
                    result = engine.run_backup()
                    
                    if result:
                        self.stdout.write(self.style.SUCCESS(f" -> Sucesso: {device.name}"))
                    else:
                        self.stdout.write(self.style.ERROR(f" -> Falha: {device.name}"))
                
                sched.last_run = now
                sched.save()
            else:
                self.stdout.write(f"Rotina {sched.name} pulada (Nao e dia de execucao)")
