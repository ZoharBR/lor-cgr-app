import concurrent.futures
import subprocess
import requests
from django.core.management.base import BaseCommand
from django.utils import timezone
from devices.models import Device

# Importação específica para a versão 4.4.12
from pysnmp.entity.rfc3413.oneliner import cmdgen

TELEGRAM_TOKEN = "8007254747:AAG4qHFRUhoCh4AZcNWP3YRmidvaV4WU-jI"
TELEGRAM_CHAT_ID = "127252755"

class Command(BaseCommand):
    help = 'Monitoramento LOR CGR - Versão Estável 4.4.12'

    def send_telegram(self, msg):
        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        try:
            requests.post(url, data={"chat_id": TELEGRAM_CHAT_ID, "text": msg, "parse_mode": "Markdown"}, timeout=5)
        except:
            pass

    def get_snmp_data(self, device):
        print(f"  [SNMP] Consultando {device.ip_address}...")
        try:
            cg = cmdgen.CommandGenerator()
            
            # OID Uptime: 1.3.6.1.2.1.1.3.0
            # OID CPU Mikrotik: 1.3.6.1.2.1.25.3.3.1.2.1
            
            errorIndication, errorStatus, errorIndex, varBinds = cg.getCmd(
                cmdgen.CommunityData(device.snmp_community),
                cmdgen.UdpTransportTarget((device.ip_address, 161), timeout=2, retries=1),
                '1.3.6.1.2.1.1.3.0',
                '1.3.6.1.2.1.25.3.3.1.2.1'
            )

            if errorIndication or errorStatus:
                print(f"  [SNMP] Erro: {errorIndication or errorStatus}")
                return 0, "Erro"
            
            uptime_ticks = int(varBinds[0][1])
            uptime_str = f"{int(uptime_ticks/8640000)}d {int((uptime_ticks%8640000)/360000)}h"
            cpu_val = int(varBinds[1][1])
            
            print(f"  [SNMP] OK! CPU: {cpu_val}%")
            return cpu_val, uptime_str

        except Exception as e:
            print(f"  [SNMP] Falha: {str(e)}")
            return 0, "-"

    def process_device(self, device):
        print(f"\n[*] Equipamento: {device.name} ({device.ip_address})")
        old_status = device.status
        
        # Ping
        ping = subprocess.run(['ping', '-c', '1', '-W', '2', device.ip_address], stdout=subprocess.DEVNULL)
        is_up = (ping.returncode == 0)
        
        device.status = is_up
        if is_up:
            print(f"  [PING] OK")
            device.last_seen = timezone.now()
            if device.snmp_community:
                device.cpu_usage, device.uptime = self.get_snmp_data(device)
        else:
            print(f"  [PING] DOWN")
            device.cpu_usage = 0
            device.uptime = "Offline"
        
        device.save()
        
        if old_status != is_up:
            status_txt = "✅ ONLINE" if is_up else "🚨 OFFLINE"
            self.send_telegram(f"{status_txt}: *{device.name}* ({device.ip_address})")

    def handle(self, *args, **kwargs):
        devices = Device.objects.filter(is_active=True)
        if not devices:
            print("Nenhum dispositivo ativo encontrado.")
            return
            
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            executor.map(self.process_device, devices)
        print("\n[FIM] Coleta concluída.")
