import os
from netmiko import ConnectHandler
from django.conf import settings
from django.utils import timezone
from devices.models import Device, DeviceBackup

def perform_device_backup(device):
    print(f"--- Iniciando Backup de {device.name} ---")
    
    # 1. Define a porta (Lendo do campo Porta SSH ou padrão 22)
    porta_ssh = device.ssh_port if device.ssh_port else 22
    
    params = {
        'device_type': 'huawei' if device.vendor == 'Huawei' else 'mikrotik_routeros',
        'host': device.ip,
        'username': device.user,
        'password': device.password,
        'port': int(porta_ssh),
        'timeout': 120,
        'global_delay_factor': 2
    }
    
    try:
        print(f"Conectando em {device.ip}:{porta_ssh}...")
        with ConnectHandler(**params) as net_connect:
            
            # 2. Executa o comando de exportação
            if device.vendor == 'Huawei':
                net_connect.send_command('screen-length 0 temporary')
                config = net_connect.send_command('display current-configuration')
            else:
                config = net_connect.send_command('/export show-sensitive')
            
            # Verifica se baixou algo útil
            if not config or len(config) < 50:
                raise Exception("Configuração vazia recebida.")

            # 3. Salva o arquivo no disco
            folder = os.path.join(settings.MEDIA_ROOT, 'backups')
            os.makedirs(folder, exist_ok=True)
            
            nome_arquivo = f"backup_{device.name}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.txt"
            caminho_completo = os.path.join(folder, nome_arquivo)
            
            with open(caminho_completo, 'w', encoding='utf-8') as f:
                f.write(config)
            
            # 4. Grava no Banco de Dados (CORREÇÃO AQUI: usa 'file' e caminho relativo)
            tamanho = f"{len(config)/1024:.2f} KB"
            DeviceBackup.objects.create(
                device=device, 
                file='backups/' + nome_arquivo,  # Campo correto: 'file'
                status="Sucesso",
                size=tamanho
            )
            
            print("--- Backup Finalizado com Sucesso ---")
            return True

    except Exception as e:
        print(f"ERRO NO BACKUP: {str(e)}")
        # Tenta salvar o erro no banco
        DeviceBackup.objects.create(device=device, status=f"Falha: {str(e)}")
        return False
