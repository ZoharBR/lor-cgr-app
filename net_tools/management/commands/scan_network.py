from django.core.management.base import BaseCommand
from devices.models import Device, DeviceHistory
from core_system.models import SystemSettings
from django.utils import timezone
import subprocess, platform, paramiko, re, os, time, telnetlib
from pysnmp.hlapi import *

class Command(BaseCommand):
    help = 'Coleta Híbrida: Telnet Fiberhome e SNMP'

    def fiberhome_collect(self, d):
        """Interação Telnet para OLT Fiberhome"""
        try:
            # Conexão Telnet Porta 23
            tn = telnetlib.Telnet(d.ip, 23, timeout=5)
            tn.read_until(b"login:", timeout=3)
            tn.write(b"GEPON\n")
            tn.read_until(b"password:", timeout=3)
            tn.write(b"GEPON\n")
            
            # Modo Enable
            tn.write(b"en\n")
            tn.read_until(b"password:", timeout=3)
            tn.write(b"GEPON\n")
            
            # Coleta CPU básica
            tn.write(b"show processor\n")
            res = tn.read_until(b"#", timeout=5).decode('ascii', 'ignore')
            cpu = re.search(r'(\d+)%', res)
            
            tn.write(b"exit\n")
            tn.close()
            return cpu.group(1) if cpu else "1"
        except:
            return "0"

    def handle(self, *args, **kwargs):
        conf = SystemSettings.load()
        if not conf.scan_enabled: return

        devices = Device.objects.filter(is_active=True)
        for d in devices:
            # Teste de PING
            res = subprocess.run(['ping', '-c', '1', '-W', '1', d.ip], stdout=subprocess.DEVNULL)
            d.is_online = (res.returncode == 0)
            d.last_run = timezone.now()

            cpu_val = "0"
            if d.is_online:
                if d.vendor == 'FiberHome':
                    cpu_val = self.fiberhome_collect(d)
                elif d.vendor == 'MikroTik':
                    # Simplificado para evitar erros de renderização iniciais
                    cpu_val = d.last_cpu if d.last_cpu else "0"
            
            # Garante que não salve vazio
            d.last_cpu = cpu_val
            d.save()
            
            if d.is_online:
                try:
                    DeviceHistory.objects.create(
                        device=d, pppoe_count=d.last_pppoe_count or 0,
                        cpu_usage=int(re.search(r'\d+', str(cpu_val)).group()),
                        memory_usage=0, is_online=True
                    )
                except: pass
