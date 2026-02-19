from django.core.management.base import BaseCommand
from django.utils import timezone
from devices.models import Device, DeviceHistory
import subprocess

class Command(BaseCommand):
    help = 'Coleta SNMP Respeitando Cadastro (Porta, Community e Versão)'

    def snmp_get(self, device, oid):
        """Executa snmpget usando os dados EXATOS do banco"""
        try:
            # Monta a flag de versão (-v2c ou -v1)
            ver = '-v2c' if device.snmp_version == '2c' else '-v1'
            
            # Monta o comando respeitando IP, Porta e Community do cadastro
            cmd = [
                'snmpget', ver, 
                '-c', device.snmp_community, 
                '-O', 'qv', '-t', '2', '-r', '1', 
                f"{device.ip}:{device.snmp_port}",  # Usa a porta cadastrada (Ex: 192.168.1.1:161)
                oid
            ]
            
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            val = res.stdout.strip().replace('"', '')
            
            # Se der erro ou vazio, retorna None
            if not val or "Timeout" in val or "Unknown" in val:
                return None
            return val
        except:
            return None

    def get_uptime_str(self, device):
        # OID Padrão de Uptime
        val = self.snmp_get(device, '.1.3.6.1.2.1.1.3.0')
        if val: return val # Retorna ex: "10 days, 2:30:00"
        return "-"

    def handle(self, *args, **kwargs):
        devices = Device.objects.filter(is_active=True)
        
        for d in devices:
            cpu_final = 0
            pppoe_final = 0
            
            # === 1. LÓGICA DE CPU ===
            # Se tiver OID manual no banco, usa ele. Se não, usa o padrão do Vendor.
            oid_target = d.oid_cpu
            
            if not oid_target:
                # FALLBACK: Se não tiver OID salvo, define baseado no Fabricante
                if d.vendor == 'MikroTik':
                    oid_target = '.1.3.6.1.2.1.25.3.3.1.2.1' # Core 1
                elif d.vendor == 'Huawei':
                    # Tenta NE8000 (Slot 9)
                    val = self.snmp_get(d, '.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5.9')
                    if not val or not val.isdigit():
                        # Se falhar, tenta Switch (Slot 0)
                        oid_target = '.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5.0'
                    else:
                        oid_target = '.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5.9'
                elif d.vendor == 'Cisco' or d.vendor == 'Linux':
                    oid_target = '.1.3.6.1.4.1.9.2.1.56.0'

            # Executa a coleta da CPU
            if oid_target:
                val = self.snmp_get(d, oid_target)
                if val and val.isdigit(): cpu_final = int(val)


            # === 2. LÓGICA DE PPPoE ===
            if d.collect_pppoe:
                oid_ppp = d.oid_pppoe
                
                if not oid_ppp:
                    # FALLBACK
                    if d.vendor == 'MikroTik':
                        oid_ppp = '.1.3.6.1.4.1.14988.1.1.1.1.1.4.0'
                    elif d.vendor == 'Huawei':
                        oid_ppp = '.1.3.6.1.4.1.2011.5.25.40.4.1.11.0'

                if oid_ppp:
                    val = self.snmp_get(d, oid_ppp)
                    if val and val.isdigit(): pppoe_final = int(val)


            # === 3. UPTIME ===
            uptime_txt = self.get_uptime_str(d)

            # === SALVAR NO BANCO ===
            # Só salva online se conseguir ler Uptime ou CPU
            is_online = (uptime_txt != "-")
            
            d.last_cpu = str(cpu_final)
            d.last_pppoe_count = str(pppoe_final)
            d.uptime_str = uptime_txt
            d.is_online = is_online
            d.last_run = timezone.now()
            d.save()
            
            # Histórico para gráfico
            DeviceHistory.objects.create(
                device=d, 
                cpu_usage=cpu_final, 
                pppoe_count=pppoe_final, 
                is_online=is_online
            )
            
            self.stdout.write(f"[{d.name}] Vendor: {d.vendor} | CPU: {cpu_final}% | PPPoE: {pppoe_final} | Online: {is_online}")
