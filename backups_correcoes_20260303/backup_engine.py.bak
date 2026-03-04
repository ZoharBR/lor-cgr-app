import paramiko
import time
from django.utils import timezone
from django.core.files.base import ContentFile
from devices.models import Device, DeviceBackup

def run_device_backup(device_id):
    """
    Conecta no equipamento via SSH, extrai a configuração e salva
    com o nome: NomeDoEquipamento_ANO-MES-DIA_HORA-MINUTO.extensao
    """
    try:
        device = Device.objects.get(id=device_id)
        
        # Configura SSH
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            device.ip, 
            port=device.port, 
            username=device.user, 
            password=device.password, 
            timeout=15,
            look_for_keys=False,
            allow_agent=False
        )

        config_output = ""
        file_extension = "txt"

        # === LÓGICA MIKROTIK ===
        if device.vendor == 'MikroTik':
            file_extension = "rsc" # Script RouterOS
            stdin, stdout, stderr = ssh.exec_command('/export verbose')
            config_output = stdout.read().decode('utf-8', 'ignore')

        # === LÓGICA HUAWEI ===
        elif device.vendor == 'Huawei':
            file_extension = "cfg" # Config Huawei
            channel = ssh.invoke_shell()
            channel.settimeout(10)
            
            # Comandos para exibir configuração sem pausas
            commands = [
                'screen-length 0 temporary', 
                'display current-configuration'
            ]
            
            for cmd in commands:
                channel.send(cmd + '\n')
                time.sleep(0.5)
            
            # Aguarda o buffer encher
            time.sleep(3)
            
            while channel.recv_ready():
                config_output += channel.recv(9999).decode('utf-8', 'ignore')
            
            # Limpeza básica do output (opcional, remove prompts)
            # config_output = config_output.replace('More...', '')

        ssh.close()

        # Verifica se veio algo vazio
        if not config_output or len(config_output) < 50:
            raise Exception("O equipamento retornou um arquivo vazio ou muito curto.")

        # === NOMEAÇÃO DO ARQUIVO (AQUI ESTÁ A MUDANÇA) ===
        # Formato: Nome_YYYY-MM-DD_HH-MM-SS.ext
        timestamp = timezone.now().strftime('%Y-%m-%d_%H-%M-%S')
        safe_name = device.name.replace(" ", "_") # Remove espaços do nome
        filename = f"{safe_name}_{timestamp}.{file_extension}"

        # Salva no Banco de Dados
        backup = DeviceBackup(
            device=device,
            status="Sucesso: Configuração extraída com êxito.",
            size=f"{len(config_output)/1024:.2f} KB"
        )
        # O Django salva automaticamente na pasta /media/backups/
        backup.file.save(filename, ContentFile(config_output))
        backup.save()

        return True, f"Backup de {device.name} realizado com sucesso!"

    except Exception as e:
        # Registra a falha no banco também
        try:
            DeviceBackup.objects.create(
                device=device,
                status=f"Erro: {str(e)}",
                size="0 KB"
            )
        except: pass
        
        return False, f"Erro ao fazer backup de {device.name}: {str(e)}"
