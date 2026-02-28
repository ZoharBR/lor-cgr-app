"""
Task Celery para LOR CGR
- PING para verificar status online
- SNMP para coletar informacoes (so se PING responder)
- SSH apenas para backups agendados
"""
from celery import shared_task
from .models import Device, DeviceHistory, DeviceBackup
import subprocess
import socket
from datetime import datetime
import os

# SNMP imports
try:
    from pysnmp.hlapi import getCmd, SnmpEngine, CommunityData, UdpTransportTarget, ContextData, ObjectType, ObjectIdentity
    HAS_SNMP = True
except ImportError:
    HAS_SNMP = False


def ping_device(ip, count=1, timeout=2):
    """
    Verifica se equipamento responde PING (ICMP)
    Retorna True se responder, False caso contrario
    """
    try:
        result = subprocess.run(
            ['ping', '-c', str(count), '-W', str(timeout), str(ip)],
            capture_output=True,
            timeout=timeout * count + 3
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        return False
    except Exception as e:
        print(f"[PING] Erro {ip}: {e}")
        return False


def snmp_get(ip, community, oid, port=161, timeout=3):
    """
    Consulta SNMP GET - so chamado se PING responder
    """
    if not HAS_SNMP:
        return None
    
    try:
        iterator = getCmd(
            SnmpEngine(),
            CommunityData(community),
            UdpTransportTarget((ip, port), timeout=timeout, retries=1),
            ContextData(),
            ObjectType(ObjectIdentity(oid))
        )
        
        errorIndication, errorStatus, errorIndex, varBinds = next(iterator)
        
        if errorIndication or errorStatus:
            return None
        
        for varBind in varBinds:
            return str(varBind[1])
        
        return None
    except Exception as e:
        print(f"[SNMP] Erro {ip}: {e}")
        return None


@shared_task
def check_devices_status():
    """
    Verifica status via PING apenas
    Roda a cada 30 segundos
    NAO TENTA SSH ou SNMP se PING falhar!
    """
    devices = Device.objects.all()
    online_count = 0
    offline_count = 0
    
    for device in devices:
        # APENAS PING - nada mais!
        is_reachable = ping_device(str(device.ip))
        
        # Atualizar status
        if device.is_online != is_reachable:
            device.is_online = is_reachable
            device.save(update_fields=['is_online'])
            
            # Log de mudanca
            DeviceHistory.objects.create(
                device=device,
                event_type='STATUS_CHANGE',
                description=f'Equipamento {"ONLINE" if is_reachable else "OFFLINE"}'
            )
            
            status_msg = "ONLINE" if is_reachable else "OFFLINE"
            print(f"[STATUS] {device.name} ({device.ip}): {status_msg}")
        
        if is_reachable:
            online_count += 1
        else:
            offline_count += 1
    
    return f"Verificados: {online_count} online, {offline_count} offline"


@shared_task
def collect_device_info_snmp():
    """
    Coleta informacoes via SNMP
    IMPORTANTE: So processa equipamentos que respondem ao PING!
    Roda a cada 5 minutos
    """
    devices = Device.objects.filter(is_online=True)
    updated = 0
    skipped = 0
    
    for device in devices:
        # VERIFICAR PING PRIMEIRO - mesmo que is_online=True
        if not ping_device(str(device.ip)):
            skipped += 1
            continue
        
        # Equipamento responde PING, tentar SNMP
        if not device.snmp_community:
            continue
        
        try:
            # SysDescr - Descricao do sistema
            sys_descr = snmp_get(
                str(device.ip), 
                device.snmp_community, 
                '1.3.6.1.2.1.1.1.0', 
                device.snmp_port or 161
            )
            
            # SysName - Nome
            sys_name = snmp_get(
                str(device.ip), 
                device.snmp_community, 
                '1.3.6.1.2.1.1.5.0', 
                device.snmp_port or 161
            )
            
            # Uptime
            sys_uptime = snmp_get(
                str(device.ip), 
                device.snmp_community, 
                '1.3.6.1.2.1.1.3.0', 
                device.snmp_port or 161
            )
            
            # Atualizar se obteve dados
            if sys_descr:
                device.os_version = sys_descr[:200]
            
            if sys_name and (not device.name or device.name == str(device.ip)):
                device.name = sys_name
            
            if sys_uptime:
                # Converter timeticks para legivel
                try:
                    ticks = int(sys_uptime)
                    days = ticks // 8640000
                    hours = (ticks % 8640000) // 360000
                    device.uptime = f"{days}d {hours}h"
                except:
                    pass
            
            device.save()
            updated += 1
            
        except Exception as e:
            print(f"[SNMP] Erro {device.name}: {e}")
    
    return f"SNMP: {updated} atualizados, {skipped} offline/skipped"


@shared_task
def backup_device_configs():
    """
    Backup de configuracoes via SSH
    IMPORTANTE: So executa se PING responder!
    """
    devices = Device.objects.filter(backup_enabled=True, is_online=True)
    success = 0
    failed = 0
    skipped = 0
    
    for device in devices:
        # VERIFICAR PING PRIMEIRO
        if not ping_device(str(device.ip)):
            print(f"[BACKUP] {device.name} nao responde PING - pulando")
            skipped += 1
            continue
        
        # Equipamento online via PING, pode tentar SSH
        try:
            from netmiko import ConnectHandler
            
            vendor_drivers = {
                'huawei': 'huawei',
                'cisco': 'cisco_ios',
                'mikrotik': 'mikrotik_routeros',
                'juniper': 'juniper_junos',
            }
            
            device_type = vendor_drivers.get(
                device.vendor.lower() if device.vendor else '', 
                'cisco_ios'
            )
            
            conn = {
                'device_type': device_type,
                'host': str(device.ip),
                'port': device.port or 22,
                'username': device.username,
                'password': device.password,
                'timeout': 30,
            }
            
            with ConnectHandler(**conn) as ssh:
                if 'huawei' in (device.vendor or '').lower():
                    ssh.send_command("screen-length 0 temporary")
                    config = ssh.send_command("display current-configuration")
                elif 'mikrotik' in (device.vendor or '').lower():
                    config = ssh.send_command("/export verbose")
                else:
                    config = ssh.send_command("show running-config")
            
            # Salvar arquivo
            backup_dir = f"/opt/lorcgr/backups/{device.name}"
            os.makedirs(backup_dir, exist_ok=True)
            
            filename = f"{backup_dir}/backup_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.cfg"
            
            with open(filename, 'w') as f:
                f.write(config)
            
            DeviceBackup.objects.create(
                device=device,
                file_path=filename,
                status='success'
            )
            
            print(f"[BACKUP] {device.name}: OK")
            success += 1
            
        except Exception as e:
            print(f"[BACKUP] {device.name}: ERRO - {e}")
            DeviceBackup.objects.create(
                device=device,
                file_path='',
                status='failed'
            )
            failed += 1
    
    return f"Backups: {success} ok, {failed} erro, {skipped} pulados"
