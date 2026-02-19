import paramiko
import os
import time
from datetime import datetime
from django.conf import settings
from devices.models import DeviceBackup

class BackupEngine:
    def __init__(self, device):
        self.device = device
        self.ip = device.ip_address
        self.user = device.username
        self.password = device.password
        self.port = int(device.ssh_port) if device.ssh_port else 22
        # Identifica a marca de forma simples (tudo minusculo)
        self.brand = str(device.brand).lower()

    def run_backup(self):
        """
        Executa o backup baseado na marca do equipamento
        """
        try:
            # 1. Cria a conexao SSH
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            client.connect(
                self.ip,
                username=self.user,
                password=self.password,
                port=self.port,
                timeout=10,
                look_for_keys=False,
                allow_agent=False
            )

            config_content = ""
            file_extension = ".txt"

            # 2. Lógica Específica por Marca
            
            if 'mikrotik' in self.brand or 'routeros' in self.brand:
                # --- MIKROTIK ---
                file_extension = ".rsc"
                # O comando /export verbose garante que vem tudo
                stdin, stdout, stderr = client.exec_command('/export verbose')
                config_content = stdout.read().decode('utf-8', errors='ignore')

            elif 'huawei' in self.brand:
                # --- HUAWEI (O Pulo do Gato) ---
                file_extension = ".cfg"
                
                # Huawei precisa de um shell interativo para o screen-length funcionar bem
                shell = client.invoke_shell()
                time.sleep(1) # Espera o shell estabilizar
                
                # Desativa paginacao (---- More ----)
                shell.send("screen-length 0 temporary\n")
                time.sleep(0.5)
                
                # Pede a config
                shell.send("display current-configuration\n")
                
                # Loop de leitura inteligente
                # Lê até parar de vir dados por 3 segundos
                buffer = b""
                while True:
                    if shell.recv_ready():
                        data = shell.recv(65535)
                        buffer += data
                    else:
                        time.sleep(0.5)
                        if not shell.recv_ready():
                            break
                
                raw_output = buffer.decode('utf-8', errors='ignore')
                
                # Limpeza: Remove o cabeçalho do comando e prompts sujos
                # Pega tudo que vem depois do comando display
                if "display current-configuration" in raw_output:
                    config_content = raw_output.split("display current-configuration")[-1]
                else:
                    config_content = raw_output

            elif 'cisco' in self.brand:
                # --- CISCO ---
                file_extension = ".cfg"
                shell = client.invoke_shell()
                shell.send("terminal length 0\n") # Desativa paginacao Cisco
                time.sleep(0.5)
                shell.send("show running-config\n")
                time.sleep(2)
                
                buffer = b""
                while shell.recv_ready():
                    buffer += shell.recv(65535)
                    time.sleep(0.5)
                config_content = buffer.decode('utf-8', errors='ignore')

            else:
                # Genérico (Linux)
                stdin, stdout, stderr = client.exec_command('cat /etc/config 2>/dev/null || cat /etc/issue')
                config_content = stdout.read().decode('utf-8', errors='ignore')

            client.close()

            # 3. Validação Básica
            if not config_content or len(config_content) < 50:
                print(f"Erro: Backup vazio para {self.device.name}")
                return False

            # 4. Salvar Arquivo
            filename = f"backup_{self.device.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_extension}"
            
            # Remove caracteres proibidos no nome do arquivo
            filename = "".join([c for c in filename if c.isalpha() or c.isdigit() or c in '._-'])
            
            # Caminho: /opt/lorcgr/media/backups/
            backup_dir = os.path.join(settings.MEDIA_ROOT, 'backups')
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)
                
            full_path = os.path.join(backup_dir, filename)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(config_content)

            # 5. Registrar no Banco
            DeviceBackup.objects.create(
                device=self.device,
                file_path=f"backups/{filename}"
            )
            
            return True

        except Exception as e:
            print(f"Erro no Backup ({self.device.name}): {str(e)}")
            return False
