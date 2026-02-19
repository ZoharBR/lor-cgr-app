from django.core.management.base import BaseCommand
from devices.models import Device
import paramiko, re

class Command(BaseCommand):
    help = 'Inventário Diário: Serial, Modelo, Versão'

    def handle(self, *args, **kwargs):
        devices = Device.objects.filter(is_active=True)
        self.stdout.write("--- Iniciando Inventário Diário ---")

        for d in devices:
            if not d.is_online: continue
            
            try:
                ssh = paramiko.SSHClient()
                ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                ssh.connect(d.ip, port=d.port, username=d.user, password=d.password, timeout=10)
                
                # === MIKROTIK ===
                if d.vendor == 'MikroTik':
                    # Serial e Modelo (/system routerboard print)
                    stdin, stdout, stderr = ssh.exec_command('/system routerboard print without-paging')
                    out_rb = stdout.read().decode()
                    
                    serial_match = re.search(r'serial-number:\s*(.+)', out_rb)
                    if serial_match: d.serial_number = serial_match.group(1).strip()
                    
                    model_match = re.search(r'model:\s*(.+)', out_rb)
                    if model_match: d.model_name = model_match.group(1).strip()
                    
                    # Versão
                    stdin, stdout, stderr = ssh.exec_command('/system resource print without-paging')
                    out_res = stdout.read().decode()
                    ver_match = re.search(r'version:\s*(.+)', out_res)
                    if ver_match: d.firmware_version = ver_match.group(1).split(' ')[0]

                # === HUAWEI ===
                elif d.vendor == 'Huawei':
                    # Versão
                    chan = ssh.invoke_shell()
                    chan.send('screen-length 0 temporary\n')
                    chan.send('display version\n')
                    import time
                    time.sleep(2)
                    out_ver = ""
                    while chan.recv_ready(): out_ver += chan.recv(9999).decode('utf-8', 'ignore')
                    
                    ver_match = re.search(r'Version\s+([\d\.]+)', out_ver)
                    if ver_match: d.firmware_version = ver_match.group(1)
                    
                    model_match = re.search(r'HUAWEI\s+([A-Z0-9\-]+)\s+Router', out_ver)
                    if model_match: d.model_name = model_match.group(1)
                    else: d.model_name = "NetEngine 8000"

                    # Serial (Geralmente no display esn ou display device)
                    chan.send('display esn\n')
                    time.sleep(1)
                    out_esn = ""
                    while chan.recv_ready(): out_esn += chan.recv(9999).decode('utf-8', 'ignore')
                    
                    esn_match = re.search(r'ESN of master.*:\s*([A-Z0-9]+)', out_esn)
                    if esn_match: d.serial_number = esn_match.group(1)

                d.save()
                self.stdout.write(self.style.SUCCESS(f"[{d.name}] Inventário: {d.model_name} | SN: {d.serial_number}"))
                ssh.close()

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"[{d.name}] Erro Inventário: {e}"))

        self.stdout.write("--- Inventário Concluído ---")
