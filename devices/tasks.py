"""
Task Celery para LOR CGR
- ICMP para verificar status online com latencia e perda
- SNMP para coletar informacoes (so se ICMP responder)
- SSH apenas para backups agendados
"""
from celery import shared_task
from .models import Device, DeviceHistory, DeviceBackup, ICMPCheckHistory
import subprocess
import socket
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

# SNMP imports
try:
    from pysnmp.hlapi import getCmd, SnmpEngine, CommunityData, UdpTransportTarget, ContextData, ObjectType, ObjectIdentity
    HAS_SNMP = True
except ImportError:
    HAS_SNMP = False


def ping_device_detailed(ip, count=5, timeout=2):
    """
    Verifica equipamento via ICMP com estatisticas detalhadas
    Retorna: {
        'success': bool,
        'packets_sent': int,
        'packets_received': int,
        'packet_loss': float,
        'min_latency': float,
        'avg_latency': float,
        'max_latency': float
    }
    """
    import re
    
    result = {
        'success': False,
        'packets_sent': count,
        'packets_received': 0,
        'packet_loss': 100.0,
        'min_latency': 0,
        'avg_latency': 0,
        'max_latency': 0
    }
    
    try:
        cmd = ['/usr/bin/ping', '-c', str(count), '-W', str(timeout), '-i', '0.2', '-q', str(ip)]
        process = subprocess.run(cmd, capture_output=True, text=True, timeout=count * timeout + 5)
        output = process.stdout
        
        # Parsear estatisticas de pacotes
        packet_match = re.search(r'(\d+)\s+packets transmitted,\s+(\d+)\s+received', output)
        if packet_match:
            result['packets_sent'] = int(packet_match.group(1))
            result['packets_received'] = int(packet_match.group(2))
            if result['packets_sent'] > 0:
                loss = (result['packets_sent'] - result['packets_received']) / result['packets_sent'] * 100
                result['packet_loss'] = round(loss, 1)
        
        # Parsear latencia
        latency_match = re.search(r'rtt\s+min/avg/max/mdev\s+=\s+([\d.]+)/([\d.]+)/([\d.]+)', output)
        if latency_match:
            result['min_latency'] = float(latency_match.group(1))
            result['avg_latency'] = float(latency_match.group(2))
            result['max_latency'] = float(latency_match.group(3))
            result['success'] = True
        
    except subprocess.TimeoutExpired:
        logger.warning(f"ICMP timeout para {ip}")
    except Exception as e:
        logger.error(f"Erro ICMP {ip}: {e}")
    
    return result


def determine_icmp_status(ping_result):
    """
    Determina status baseado no resultado do ping
    - online: < 20ms sem perda
    - warning: >= 20ms sem perda
    - offline: com perda ou nao responde
    """
    if not ping_result['success']:
        return 'offline'
    
    if ping_result['packet_loss'] > 0:
        return 'offline'
    
    if ping_result['avg_latency'] >= 20:
        return 'warning'
    
    return 'online'


@shared_task
def check_devices_status():
    """
    Verifica status via ICMP com latencia e perda
    Roda a cada 30 segundos
    """
    from django.utils import timezone
    
    devices = Device.objects.all()
    online_count = 0
    warning_count = 0
    offline_count = 0
    
    for device in devices:
        # Executar ping detalhado
        ping_result = ping_device_detailed(str(device.ip))
        
        # Determinar status
        status = determine_icmp_status(ping_result)
        
        # Status anterior para log
        old_status = device.icmp_status
        
        # Atualizar dispositivo
        device.icmp_status = status
        device.icmp_latency = ping_result['avg_latency']
        device.icmp_packet_loss = ping_result['packet_loss']
        device.last_icmp_check = timezone.now()
        device.is_online = (status in ['online', 'warning'])
        device.save(update_fields=[
            'icmp_status', 'icmp_latency', 'icmp_packet_loss',
            'last_icmp_check', 'is_online'
        ])
        
        # Salvar historico
        ICMPCheckHistory.objects.create(
            device=device,
            packets_sent=ping_result['packets_sent'],
            packets_received=ping_result['packets_received'],
            packet_loss=ping_result['packet_loss'],
            min_latency=ping_result['min_latency'],
            avg_latency=ping_result['avg_latency'],
            max_latency=ping_result['max_latency'],
            status=status
        )
        
        # Log de mudanca de status
        if old_status != status:
            DeviceHistory.objects.create(
                device=device,
                event_type='STATUS_CHANGE',
                description=f'Status mudou de {old_status} para {status} (latencia: {ping_result["avg_latency"]:.1f}ms)'
            )
            logger.info(f"[STATUS] {device.name} ({device.ip}): {old_status} -> {status}")
        
        # Contadores
        if status == 'online':
            online_count += 1
        elif status == 'warning':
            warning_count += 1
        else:
            offline_count += 1
    
    result_msg = f"Verificados: {online_count} online, {warning_count} warning, {offline_count} offline"
    logger.info(result_msg)
    return result_msg


@shared_task
def collect_device_info_snmp():
    """
    Coleta informacoes via SNMP
    So processa equipamentos que respondem ao ICMP!
    """
    devices = Device.objects.filter(is_online=True)
    updated = 0
    skipped = 0
    
    for device in devices:
        # Verificar ICMP primeiro
        ping_result = ping_device_detailed(str(device.ip), count=1, timeout=2)
        if not ping_result['success']:
            skipped += 1
            continue
        
        # Equipamento online, tentar SNMP
        if not device.snmp_community:
            continue
        
        try:
            # SysDescr
            sys_descr = snmp_get(str(device.ip), device.snmp_community, '1.3.6.1.2.1.1.1.0', device.snmp_port or 161)
            # SysName
            sys_name = snmp_get(str(device.ip), device.snmp_community, '1.3.6.1.2.1.1.5.0', device.snmp_port or 161)
            
            if sys_descr:
                device.os_version = sys_descr[:200]
            if sys_name:
                device.name = sys_name
            
            device.save()
            updated += 1
            
        except Exception as e:
            logger.error(f"[SNMP] Erro {device.name}: {e}")
    
    return f"SNMP: {updated} atualizados, {skipped} offline"


def snmp_get(ip, community, oid, port=161, timeout=3):
    """Consulta SNMP GET"""
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
        logger.error(f"[SNMP] Erro {ip}: {e}")
        return None


@shared_task
def update_device_info():
    """Task para atualizar informacoes detalhadas"""
    return collect_device_info_snmp()


@shared_task
def run_auto_backups():
    """Backup automatico de dispositivos"""
    devices = Device.objects.filter(backup_enabled=True, is_online=True)
    success = 0
    failed = 0
    
    for device in devices:
        try:
            from netmiko import ConnectHandler
            
            vendor_drivers = {
                'huawei': 'huawei',
                'cisco': 'cisco_ios',
                'mikrotik': 'mikrotik_routeros',
                'juniper': 'juniper_junos',
            }
            
            device_type = vendor_drivers.get((device.vendor or '').lower(), 'cisco_ios')
            
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
            
            backup_dir = f"/opt/lorcgr/backups/{device.name}"
            os.makedirs(backup_dir, exist_ok=True)
            
            filename = f"{backup_dir}/backup_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.cfg"
            
            with open(filename, 'w') as f:
                f.write(config)
            
            DeviceBackup.objects.create(device=device, file_path=filename, status='success')
            success += 1
            logger.info(f"[BACKUP] {device.name}: OK")
            
        except Exception as e:
            DeviceBackup.objects.create(device=device, file_path='', status='failed')
            failed += 1
            logger.error(f"[BACKUP] {device.name}: ERRO - {e}")
    
    return f"Backups: {success} ok, {failed} erro"


import time
import paramiko
from django.utils import timezone
from .models import MassCommandExecution, MassCommandResult


@shared_task
def execute_mass_command(execution_id, variables=None):
    """Executa comandos em massa em multiplos equipamentos"""
    variables = variables or {}
    
    try:
        execution = MassCommandExecution.objects.get(id=execution_id)
    except MassCommandExecution.DoesNotExist:
        return
    
    execution.status = 'running'
    execution.started_at = timezone.now()
    execution.save()
    
    script = execution.script
    commands = script.commands
    timeout = script.timeout
    
    for key, value in variables.items():
        commands = commands.replace('{' + key + '}', str(value))
    
    success_count = 0
    failed_count = 0
    
    for device in execution.devices.all():
        result = execute_on_device(device, commands, timeout)
        
        MassCommandResult.objects.create(
            execution=execution,
            device=device,
            success=result['success'],
            output=result['output'],
            error_message=result['error'],
            execution_time=result['time'],
        )
        
        if result['success']:
            success_count += 1
        else:
            failed_count += 1
    
    if failed_count == 0:
        execution.status = 'completed'
    elif success_count == 0:
        execution.status = 'failed'
    else:
        execution.status = 'partial'
    
    execution.finished_at = timezone.now()
    execution.save()


def execute_on_device(device, commands, timeout=30):
    """Executa comandos em um dispositivo"""
    start_time = time.time()
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        client.connect(
            hostname=device.ip,
            port=device.port,
            username=device.username,
            password=device.password,
            timeout=timeout,
            look_for_keys=False,
            allow_agent=False,
        )
        
        stdin, stdout, stderr = client.exec_command(commands, timeout=timeout)
        output = stdout.read().decode('utf-8', errors='ignore')
        error = stderr.read().decode('utf-8', errors='ignore')
        
        client.close()
        
        execution_time = time.time() - start_time
        
        return {
            'success': True,
            'output': output or error,
            'error': '',
            'time': round(execution_time, 2),
        }
        
    except Exception as e:
        execution_time = time.time() - start_time
        return {
            'success': False,
            'output': '',
            'error': str(e),
            'time': round(execution_time, 2),
        }
