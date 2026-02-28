import subprocess
import json
import logging
import requests
from datetime import datetime

logger = logging.getLogger(__name__)

# Usuário atual (será definido pela view)
_current_user = None
_current_ip = None

def set_current_user(user, ip_address=None):
    """Define o usuário atual para logs"""
    global _current_user, _current_ip
    _current_user = user
    _current_ip = ip_address

def get_current_user():
    return _current_user

def get_current_ip():
    return _current_ip

def ping_device(ip, count=1, timeout=2):
    try:
        r = subprocess.run(['ping', '-c', str(count), '-W', str(timeout), str(ip)], capture_output=True, timeout=timeout*count+3)
        return r.returncode == 0
    except:
        return False

def ssh_exec(hostname, username, password, command, port=22, timeout=30):
    try:
        import paramiko
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, port=port, username=username, password=password, timeout=timeout)
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        output = stdout.read().decode('utf-8', errors='ignore')
        error = stderr.read().decode('utf-8', errors='ignore')
        client.close()
        return {'success': True, 'output': output, 'error': error}
    except Exception as e:
        return {'success': False, 'output': '', 'error': str(e)}

def log_ssh_command(device, command, output, success):
    """Registra comando SSH no log de auditoria"""
    try:
        from users.log_helper import log_ssh
        user = get_current_user()
        ip = get_current_ip()
        if user and user.is_authenticated:
            log_ssh(
                user=user,
                device_ip=device.ip_address,
                device_name=device.name,
                command=command,
                output=output,
                success=success,
                ip_address=ip
            )
    except Exception as e:
        logger.error(f"Erro ao registrar log SSH: {e}")

def tool_list_devices(filters=None):
    from devices.models import Device
    qs = Device.objects.all()
    if filters and filters.get('online') is not None:
        qs = qs.filter(is_online=filters['online'])
    devices = []
    for d in qs[:50]:
        devices.append({'id': d.id, 'name': d.name, 'hostname': d.hostname, 'ip_address': d.ip_address, 'device_type': d.device_type, 'status': 'Online' if d.is_online else 'Offline', 'location': d.location or 'N/A'})
    
    # Log da ação
    try:
        from users.log_helper import log_action
        user = get_current_user()
        if user and user.is_authenticated:
            log_action(user=user, action='DEVICE_LIST', description=f'Listou {len(devices)} dispositivos', ip_address=get_current_ip())
    except:
        pass
    
    return {'total': qs.count(), 'devices': devices}

def tool_get_device(device_id=None, ip_address=None, hostname=None):
    from devices.models import Device
    try:
        if device_id:
            d = Device.objects.get(id=device_id)
        elif ip_address:
            d = Device.objects.get(ip_address=ip_address)
        elif hostname:
            d = Device.objects.get(hostname=hostname)
        else:
            return {'error': 'Forneça device_id, ip_address ou hostname'}
        
        # Log da ação
        try:
            from users.log_helper import log_action
            user = get_current_user()
            if user and user.is_authenticated:
                log_action(user=user, action='DEVICE_VIEW', description=f'Visualizou dispositivo {d.name} ({d.ip_address})', ip_address=get_current_ip(), metadata={'device_id': d.id, 'device_name': d.name})
        except:
            pass
        
        return {'id': d.id, 'name': d.name, 'hostname': d.hostname, 'ip_address': d.ip_address, 'device_type': d.device_type, 'vendor': d.vendor, 'model': d.model, 'status': 'Online' if d.is_online else 'Offline', 'location': d.location}
    except Device.DoesNotExist:
        return {'error': 'Dispositivo nao encontrado'}

def tool_ssh_command(device_id=None, ip_address=None, command=None):
    from devices.models import Device, DeviceHistory
    if not command:
        return {'error': 'Comando nao especificado'}
    try:
        d = Device.objects.get(id=device_id) if device_id else Device.objects.get(ip_address=ip_address)
        if not d.is_online:
            return {'error': 'Dispositivo offline'}
        if not d.ssh_username or not d.ssh_password:
            return {'error': 'Sem credenciais SSH'}
        
        result = ssh_exec(d.ip_address, d.ssh_username, d.ssh_password, command)
        
        # Log detalhado do SSH
        full_output = result.get('output', '')
        if result.get('error'):
            full_output += '\n[ERRO]: ' + result.get('error')
        
        log_ssh_command(
            device=d,
            command=command,
            output=full_output,
            success=result.get('success', False)
        )
        
        # History antigo (mantém compatibilidade)
        DeviceHistory.objects.create(device=d, action='ssh_command', description='Comando: ' + command, details=json.dumps(result))
        
        return result
    except Device.DoesNotExist:
        return {'error': 'Dispositivo nao encontrado'}

def tool_dashboard_stats():
    from devices.models import Device
    from core_system.models import DeviceBackup
    total = Device.objects.count()
    online = Device.objects.filter(is_online=True).count()
    backups = DeviceBackup.objects.count()
    types = {}
    for d in Device.objects.all():
        t = d.device_type or 'Outros'
        types[t] = types.get(t, 0) + 1
    return {'total_devices': total, 'online_devices': online, 'offline_devices': total-online, 'total_backups': backups, 'device_types': types, 'timestamp': datetime.now().isoformat()}

def tool_search_ip(ip_address):
    from devices.models import Device
    result = {'ip': ip_address, 'found_in': []}
    try:
        d = Device.objects.get(ip_address=ip_address)
        result['lorcgr'] = {'name': d.name, 'status': 'Online' if d.is_online else 'Offline'}
        result['found_in'].append('LOR CGR')
    except:
        pass
    result['ping'] = ping_device(ip_address)
    return result

def tool_librenms_query(endpoint='devices', filters=None):
    return {'source': 'LibreNMS', 'endpoint': endpoint, 'note': 'Configure token'}

def tool_phpipam_query(endpoint='subnets', filters=None):
    return {'source': 'phpIPAM', 'endpoint': endpoint, 'note': 'Configure token'}

TOOLS = {
    'list_devices': {'function': tool_list_devices, 'description': 'Lista dispositivos', 'parameters': {'type': 'object', 'properties': {'filters': {'type': 'object'}}}},
    'get_device': {'function': tool_get_device, 'description': 'Detalhes do dispositivo', 'parameters': {'type': 'object', 'properties': {'device_id': {'type': 'integer'}, 'ip_address': {'type': 'string'}}}},
    'ssh_command': {'function': tool_ssh_command, 'description': 'Executa comando SSH', 'parameters': {'type': 'object', 'properties': {'device_id': {'type': 'integer'}, 'command': {'type': 'string'}}, 'required': ['command']}},
    'dashboard_stats': {'function': tool_dashboard_stats, 'description': 'Estatisticas do sistema', 'parameters': {'type': 'object', 'properties': {}}},
    'search_ip': {'function': tool_search_ip, 'description': 'Busca informacoes de IP', 'parameters': {'type': 'object', 'properties': {'ip_address': {'type': 'string'}}, 'required': ['ip_address']}},
    'librenms_query': {'function': tool_librenms_query, 'description': 'Consulta LibreNMS', 'parameters': {'type': 'object', 'properties': {'endpoint': {'type': 'string'}}}},
    'phpipam_query': {'function': tool_phpipam_query, 'description': 'Consulta phpIPAM', 'parameters': {'type': 'object', 'properties': {'endpoint': {'type': 'string'}}}}
}

def get_all_tools():
    return [{'name': k, 'description': v['description'], 'parameters': v['parameters']} for k, v in TOOLS.items()]

def execute_tool(name, arguments=None):
    if name not in TOOLS:
        return {'error': 'Ferramenta nao encontrada: ' + name}
    try:
        return TOOLS[name]['function'](**(arguments or {}))
    except Exception as e:
        return {'error': str(e)}
