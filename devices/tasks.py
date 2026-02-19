"""
Task Celery para verificar status online dos equipamentos
"""
from celery import shared_task
from .models import Device
import socket
import paramiko
from datetime import datetime

@shared_task
def check_devices_status():
    """
    Verifica status de todos os equipamentos via SSH
    Roda a cada 30 segundos
    """
    devices = Device.objects.all()
    
    for device in devices:
        is_reachable = check_device_online(device)
        
        # Atualizar status no banco
        if device.is_online != is_reachable:
            device.is_online = is_reachable
            device.save(update_fields=['is_online'])
            
            # Log de mudança de status
            from .models import DeviceHistory
            DeviceHistory.objects.create(
                device=device,
                event_type='STATUS_CHANGE',
                description=f'Equipamento {"ONLINE" if is_reachable else "OFFLINE"} em {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'
            )
    
    return f"Verificados {devices.count()} equipamentos"


def check_device_online(device):
    """
    Verifica se equipamento está acessível via SSH
    Retorna True se conseguir conectar, False caso contrário
    """
    try:
        # Primeiro tenta ping na porta SSH
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex((device.ip, device.port))
        sock.close()
        
        if result != 0:
            return False
        
        # Se porta aberta, tenta SSH
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        ssh.connect(
            device.ip,
            port=device.port,
            username=device.username,
            password=device.password,
            timeout=5,
            banner_timeout=5,
            auth_timeout=5,
            look_for_keys=False,
            allow_agent=False
        )
        
        ssh.close()
        return True
        
    except Exception as e:
        print(f"[{device.name}] Erro ao verificar: {str(e)}")
        return False


@shared_task
def update_device_info():
    """
    Atualiza informações detalhadas dos equipamentos online
    Roda a cada 5 minutos
    """
    from .discovery import discover_device_details
    
    devices = Device.objects.filter(is_online=True)
    updated = 0
    
    for device in devices:
        try:
            details = discover_device_details(device)
            if details:
                device.model = details.get('model', device.model)
                device.os_version = details.get('os_version', device.os_version)
                device.serial_number = details.get('serial_number', device.serial_number)
                device.save()
                updated += 1
        except Exception as e:
            print(f"Erro ao atualizar {device.name}: {e}")
    
    return f"Atualizados {updated} equipamentos"


@shared_task
def run_auto_backups():
    """
    Executa backup automático dos equipamentos configurados
    Roda às 03:00 da manhã
    """
    from netmiko import ConnectHandler
    import os
    from django.conf import settings
    
    devices = Device.objects.filter(backup_enabled=True, is_online=True)
    success = 0
    
    for device in devices:
        try:
            cmd = "/export verbose" if 'mikrotik' in device.vendor.lower() else "display current-configuration"
            conn = {
                'device_type': 'huawei' if 'huawei' in device.vendor.lower() else 'mikrotik_routeros',
                'host': device.ip,
                'username': device.username,
                'password': device.password,
                'port': device.port
            }
            
            with ConnectHandler(**conn) as ssh:
                if 'huawei' in device.vendor.lower():
                    ssh.send_command("screen-length 0 temporary")
                config = ssh.send_command(cmd)
            
            # Salvar backup
            backup_dir = os.path.join(settings.BASE_DIR, 'backups', device.name)
            os.makedirs(backup_dir, exist_ok=True)
            
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"backup_{device.name}_{timestamp}.cfg"
            filepath = os.path.join(backup_dir, filename)
            
            with open(filepath, 'w') as f:
                f.write(config)
            
            success += 1
            
        except Exception as e:
            print(f"Erro no backup de {device.name}: {e}")
    
    return f"Backups realizados: {success}/{devices.count()}"
