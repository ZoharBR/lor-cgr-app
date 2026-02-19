from django.core.management.base import BaseCommand
from django.utils import timezone
from devices.models import Device
from pysnmp.hlapi import *
import time

class Command(BaseCommand):
    help = 'Coleta dados SNMP (CPU, Uptime, Status) de todos os dispositivos ativos'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS(f"--- Iniciando Poller SNMP: {timezone.now()} ---"))
        
        devices = Device.objects.filter(is_active=True) # Pega so os ativos
        
        for dev in devices:
            self.stdout.write(f"Checando: {dev.name} ({dev.ip_address})... ", ending='')
            
            try:
                # Define OIDs baseados na marca (Simples e Direto)
                cpu_oid = '1.3.6.1.2.1.25.3.3.1.2.1' # Padrao Host-Resources (Mikrotik/Linux)
                uptime_oid = '1.3.6.1.2.1.1.3.0'
                
                if dev.brand == 'huawei':
                    cpu_oid = '1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5.1'

                # Executa SNMP GET
                iterator = getCmd(
                    SnmpEngine(),
                    CommunityData(dev.snmp_community, mpModel=1 if dev.snmp_version == '2c' else 0),
                    UdpTransportTarget((dev.ip_address, 161), timeout=1, retries=1),
                    ContextData(),
                    ObjectType(ObjectIdentity(cpu_oid)),
                    ObjectType(ObjectIdentity(uptime_oid))
                )

                errorIndication, errorStatus, errorIndex, varBinds = next(iterator)

                if errorIndication or errorStatus:
                    # Falha de conexao (Device Offline)
                    dev.status = False
                    self.stdout.write(self.style.ERROR("OFFLINE/ERRO SNMP"))
                else:
                    # Sucesso (Device Online)
                    cpu_val = int(varBinds[0][1]) if varBinds[0][1] else 0
                    uptime_val = str(varBinds[1][1])
                    
                    dev.status = True
                    dev.cpu_usage = cpu_val
                    dev.uptime = uptime_val
                    dev.last_seen = timezone.now()
                    self.stdout.write(self.style.SUCCESS(f"ONLINE (CPU: {cpu_val}%)"))

                dev.save()

            except Exception as e:
                dev.status = False
                dev.save()
                self.stdout.write(self.style.ERROR(f"ERRO CRITICO: {e}"))

        self.stdout.write(self.style.SUCCESS("--- Poller Finalizado ---"))
