import psutil
import json
import os
import datetime
import requests
import zipfile
from io import BytesIO
from django.conf import settings
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from .models import Device
from netmiko import ConnectHandler
from .discovery import discover_device_details

# --- AUXILIARES ---
def save_backup_file(device_name, content):
    backup_dir = os.path.join(settings.BASE_DIR, 'backups', device_name)
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"backup_{device_name}_{timestamp}.cfg"
    filepath = os.path.join(backup_dir, filename)
    with open(filepath, 'w') as f:
        f.write(content)
    return filename, timestamp

def get_pppoe_online(device):
    try:
        device_type = 'huawei' if device.vendor and 'huawei' in device.vendor.lower() else 'mikrotik_routeros'
        conn = {
            'device_type': device_type,
            'host': device.ip, 
            'username': device.username, 
            'password': device.password, 
            'port': device.port, 
            'timeout': 5
        }
        cmd = "display access-user summary" if 'huawei' in device.vendor.lower() else "/ppp active print count-only"
        with ConnectHandler(**conn) as ssh:
            output = ssh.send_command(cmd)
            import re
            nums = re.findall(r'\d+', output)
            return int(nums[0]) if nums else 0
    except: return -1

# --- API VIEWS ---
def api_list_devices(request):
    devices = []
    for d in Device.objects.all().order_by('id'):
        devices.append({
            'id': d.id, 
            'hostname': d.name, 
            'ip_address': d.ip, 
            'vendor': d.vendor or '',
            'device_type': d.device_type or 'Router',
            'model': d.model or '', 
            'os_version': d.os_version or '', 
            'serial_number': d.serial_number or '',
            'librenms_id': d.librenms_id, 
            'web_url': d.web_url or '', 
            'protocol': d.protocol or 'SSH', 
            'port': d.port,
            'username': d.username or '', 
            'password': d.password or '', 
            'snmp_community': d.snmp_community or '',
            'snmp_port': d.snmp_port, 
            'snmp_version': d.snmp_version or 'v2c', 
            'is_bras': d.is_bras,
            'is_online': d.is_online,
            'icmp_status': d.icmp_status or 'unknown',
            'icmp_latency': d.icmp_latency or 0,
            'icmp_packet_loss': d.icmp_packet_loss or 0,
            'last_icmp_check': d.last_icmp_check.isoformat() if d.last_icmp_check else None,
            'backup_enabled': d.backup_enabled, 
            'backup_frequency': d.backup_frequency or 'daily',
            'backup_time': d.backup_time.strftime('%H:%M') if d.backup_time else '03:00'
        })
    return JsonResponse(devices, safe=False)

@csrf_exempt
def api_save_device(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            d_id = data.get('id')
            
            if d_id:
                # UPDATE - só atualiza campos que foram enviados
                try:
                    device = Device.objects.get(id=d_id)
                except Device.DoesNotExist:
                    return JsonResponse({"status": "error", "message": "Dispositivo não encontrado"}, status=404)
                
                # Atualizar apenas campos enviados
                if data.get('hostname'): device.name = data.get('hostname')
                if data.get('ip_address'): device.ip = data.get('ip_address')
                if data.get('vendor') is not None: device.vendor = data.get('vendor')
                if data.get('device_type') is not None: device.device_type = data.get('device_type')
                if data.get('model') is not None: device.model = data.get('model')
                if data.get('os_version') is not None: device.os_version = data.get('os_version')
                if data.get('serial_number') is not None: device.serial_number = data.get('serial_number')
                if data.get('librenms_id'): device.librenms_id = int(data.get('librenms_id'))
                if data.get('web_url') is not None: device.web_url = data.get('web_url')
                if data.get('username') is not None: device.username = data.get('username')
                if data.get('password') is not None: device.password = data.get('password')
                if data.get('port'): device.port = int(data.get('port'))
                if data.get('protocol') is not None: device.protocol = data.get('protocol')
                if data.get('snmp_community') is not None: device.snmp_community = data.get('snmp_community')
                if data.get('snmp_port'): device.snmp_port = int(data.get('snmp_port'))
                if data.get('snmp_version') is not None: device.snmp_version = data.get('snmp_version')
                if 'is_bras' in data: device.is_bras = data.get('is_bras')
                if 'backup_enabled' in data: device.backup_enabled = data.get('backup_enabled')
                if data.get('backup_frequency') is not None: device.backup_frequency = data.get('backup_frequency')
                if data.get('backup_time') is not None: device.backup_time = data.get('backup_time')
                
                device.save()
                return JsonResponse({"status": "success", "id": d_id})
            else:
                # CREATE - precisa de campos obrigatórios
                if not data.get('ip_address'):
                    return JsonResponse({"status": "error", "message": "IP é obrigatório"}, status=400)
                if not data.get('hostname'):
                    return JsonResponse({"status": "error", "message": "Hostname é obrigatório"}, status=400)
                
                new_dev = Device.objects.create(
                    name=data.get('hostname'),
                    ip=data.get('ip_address'),
                    vendor=data.get('vendor', ''),
                    device_type=data.get('device_type', 'Router'),
                    port=int(data.get('port', 22)),
                    username=data.get('username', ''),
                    password=data.get('password', ''),
                    snmp_community=data.get('snmp_community', ''),
                    snmp_port=int(data.get('snmp_port', 161)),
                    is_bras=data.get('is_bras', False),
                    backup_enabled=data.get('backup_enabled', True),
                    backup_frequency=data.get('backup_frequency', 'daily'),
                )
                return JsonResponse({"status": "success", "id": new_dev.id})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error"}, status=400)

@csrf_exempt
def api_run_discovery(request):
    data = json.loads(request.body)
    dev = Device.objects.get(id=data.get('device_id'))
    details = discover_device_details(dev)
    if details:
        dev.name = details.get('hostname', dev.name)
        dev.model = details.get('model')
        dev.os_version = details.get('os_version')
        dev.serial_number = details.get('serial_number')
        dev.save()
        return JsonResponse({"status": "success", "data": details})
    return JsonResponse({"status": "error"}, status=500)

@csrf_exempt
def api_proxy_web(request, device_id, path=''):
    try:
        dev = Device.objects.get(id=device_id)
        url = dev.web_url if dev.web_url else f"http://{dev.ip}"
        if path: url = f"{url.rstrip('/')}/{path}"
        
        resp = requests.request(method=request.method, url=url, data=request.body, headers={k:v for k,v in request.headers.items() if k != 'Host'}, timeout=10, verify=False)
        return HttpResponse(content=resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type'))
    except Exception as e: return HttpResponse(f"Proxy Error: {e}", status=500)

@csrf_exempt
def api_backup_bulk_action(request):
    data = json.loads(request.body)
    paths = data.get('paths', [])
    action = data.get('action')

    if action == 'delete':
        for p in paths:
            full = os.path.join(settings.BASE_DIR, p)
            if os.path.exists(full): os.remove(full)
        return JsonResponse({"status": "success"})

    if action == 'download':
        memory_file = BytesIO()
        with zipfile.ZipFile(memory_file, 'w') as zf:
            for p in paths:
                full = os.path.join(settings.BASE_DIR, p)
                if os.path.exists(full): zf.write(full, os.path.basename(full))
        memory_file.seek(0)
        response = HttpResponse(memory_file, content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="backups_lorcgr.zip"'
        return response

@csrf_exempt
def api_run_backup(request):
    data = json.loads(request.body)
    dev = Device.objects.get(id=data.get('device_id'))
    device_type = 'mikrotik_routeros' if dev.vendor and 'mikrotik' in dev.vendor.lower() else 'huawei'
    cmd = "/export verbose" if device_type == 'mikrotik_routeros' else "display current-configuration"
    conn = {'device_type': device_type, 'host': dev.ip, 'username': dev.username, 'password': dev.password, 'port': dev.port}
    with ConnectHandler(**conn) as ssh:
        if device_type == 'huawei': ssh.send_command("screen-length 0 temporary")
        config = ssh.send_command(cmd)
    filename, date = save_backup_file(dev.name, config)
    return JsonResponse({"status": "success", "file": filename})

def api_list_backups(request):
    root = os.path.join(settings.BASE_DIR, 'backups')
    tree = []
    if os.path.exists(root):
        for d in os.listdir(root):
            d_path = os.path.join(root, d)
            if os.path.isdir(d_path):
                files = [{"name": f, "path": os.path.join('backups', d, f), "size": f"{round(os.stat(os.path.join(d_path, f)).st_size/1024, 2)} KB"} for f in os.listdir(d_path) if f.endswith('.cfg')]
                tree.append({"device": d, "backups": sorted(files, key=lambda x: x['name'], reverse=True)})
    return JsonResponse(tree, safe=False)

@csrf_exempt
def api_view_backup(request):
    data = json.loads(request.body)
    full = os.path.join(settings.BASE_DIR, data.get('path'))
    with open(full, 'r') as f: return JsonResponse({"content": f.read()})

def api_dashboard_stats(request):
    server = {"cpu": psutil.cpu_percent(), "ram": psutil.virtual_memory().percent, "disk": psutil.disk_usage('/').percent}
    bras = Device.objects.filter(is_bras=True)
    pppoe = [{"name": b.name, "ip": b.ip, "count": get_pppoe_online(b)} for b in bras]
    return JsonResponse({
        "devices_total": Device.objects.count(), 
        "bras_count": bras.count(), 
        "pppoe_total": sum(x['count'] for x in pppoe if x['count'] > 0), 
        "pppoe_details": pppoe, 
        "server_health": server
    })

def api_audit_logs(request):
    from .models import DeviceHistory, Device
    logs = []
    history = DeviceHistory.objects.select_related('device').order_by('-created_at')[:500]
    for h in history:
        logs.append({
            'id': h.id,
            'device_id': h.device.id,
            'device_name': h.device.name,
            'device_ip': h.device.ip,
            'event_type': h.event_type,
            'description': h.description,
            'created_at': h.created_at.isoformat()
        })
    return JsonResponse(logs, safe=False)

def api_terminal_sessions(request):
    from .models import TerminalSession
    sessions = []
    for s in TerminalSession.objects.select_related('device').order_by('-start_time')[:100]:
        duration = None
        if s.start_time:
            from datetime import datetime
            now = datetime.now(s.start_time.tzinfo)
            delta = now - s.start_time
            duration = f"{int(delta.total_seconds() / 60)}m {int(delta.total_seconds() % 60)}s"
        sessions.append({
            'id': s.id,
            'device_name': s.device.name,
            'device_ip': s.device.ip,
            'user': s.user,
            'start_time': s.start_time.isoformat(),
            'duration': duration,
            'has_log': bool(s.log_content)
        })
    return JsonResponse(sessions, safe=False)

def api_session_log(request, session_id):
    from .models import TerminalSession
    try:
        session = TerminalSession.objects.get(id=session_id)
        log_data = {
            'session_id': session.id,
            'device': session.device.name,
            'user': session.user,
            'start_time': session.start_time.isoformat(),
            'log_content': session.log_content if session.log_content else '[]'
        }
        return JsonResponse(log_data)
    except TerminalSession.DoesNotExist:
        return JsonResponse({'error': 'Sessão não encontrada'}, status=404)

def api_get_manual(request):
    manual_path = os.path.join(settings.BASE_DIR, 'MANUAL.md')
    try:
        with open(manual_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return JsonResponse({'status': 'success', 'content': content})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@csrf_exempt
def api_delete_backup(request):
    """Deletar arquivo de backup"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            path = data.get('path')
            if not path:
                return JsonResponse({'status': 'error', 'message': 'Caminho não fornecido'}, status=400)
            
            full_path = os.path.join(settings.BASE_DIR, path)
            
            # Segurança: verificar se está dentro do diretório de backups
            backup_dir = os.path.join(settings.BASE_DIR, 'backups')
            if not os.path.abspath(full_path).startswith(os.path.abspath(backup_dir)):
                return JsonResponse({'status': 'error', 'message': 'Caminho inválido'}, status=403)
            
            if os.path.exists(full_path):
                os.remove(full_path)
                return JsonResponse({'status': 'success', 'message': 'Backup excluído'})
            else:
                return JsonResponse({'status': 'error', 'message': 'Arquivo não encontrado'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error'}, status=400)


# ============================================
# NOVAS APIs - ICMP, LIBRENMS, INTERFACES
# ============================================

@csrf_exempt
def api_icmp_check(request, device_id=None):
    """Executa verificacao ICMP em um dispositivo ou todos"""
    from .icmp_service import ICMPChecker
    from .models import Device
    
    try:
        if device_id:
            # Verificar dispositivo especifico
            device = Device.objects.get(id=device_id)
            result = ICMPChecker.check_device(device)
            return JsonResponse({'status': 'success', 'result': result})
        else:
            # Verificar todos
            results = ICMPChecker.check_all_devices()
            return JsonResponse({'status': 'success', 'results': results, 'count': len(results)})
    except Device.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Dispositivo nao encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


def api_device_types(request):
    """Retorna os tipos de dispositivo disponiveis para cada vendor"""
    from .models import Device
    
    vendor = request.GET.get('vendor', '')
    
    if vendor:
        types = Device.get_vendor_types(vendor)
        type_choices = dict(Device.TYPE_CHOICES)
        result = [{'value': t, 'label': type_choices.get(t, t)} for t in types]
    else:
        # Retornar todos
        result = {}
        for vendor_code, vendor_name in Device.VENDOR_CHOICES:
            types = Device.get_vendor_types(vendor_code)
            type_choices = dict(Device.TYPE_CHOICES)
            result[vendor_code] = {
                'name': vendor_name,
                'types': [{'value': t, 'label': type_choices.get(t, t)} for t in types]
            }
    
    return JsonResponse(result)


@csrf_exempt
def api_librenms_sync(request):
    """Sincroniza dispositivos do LibreNMS"""
    from .models import Device
    from core_system.models import SystemSettings
    
    try:
        settings = SystemSettings.load()
        if not settings.librenms_enabled:
            return JsonResponse({'status': 'error', 'message': 'LibreNMS desabilitado'}, status=400)
        
        import requests
        headers = {'X-Auth-Token': settings.librenms_api_token}
        
        # Buscar dispositivos do LibreNMS
        response = requests.get(
            f"{settings.librenms_url}/api/v0/devices",
            headers=headers,
            timeout=10
        )
        data = response.json()
        
        if data.get('status') != 'ok':
            return JsonResponse({'status': 'error', 'message': 'Erro na API LibreNMS'}, status=500)
        
        librenms_devices = data.get('devices', [])
        created = 0
        updated = 0
        
        # Mapear OS para vendor
        os_to_vendor = {
            'routeros': 'Mikrotik', 'mikrotik': 'Mikrotik',
            'vrp': 'Huawei', 'huawei': 'Huawei',
            'ios': 'Cisco', 'iosxe': 'Cisco', 'iosxr': 'Cisco', 'nxos': 'Cisco',
            'junos': 'Juniper',
            'fiberhome': 'FiberHome', 'fh': 'FiberHome',
            'linux': 'Linux', 'ubuntu': 'Linux', 'debian': 'Linux',
            'edgeos': 'Ubiquiti', 'unifi': 'Ubiquiti',
            'fortios': 'Fortinet',
            'procurve': 'HP/Aruba', 'arubaos': 'HP/Aruba',
            'tplink': 'TP-Link',
        }
        
        # Mapear OS para tipo de dispositivo
        os_to_type = {
            'routeros': 'Router', 'mikrotik': 'Router',
            'vrp': 'Router', 'huawei': 'Router',
            'ios': 'Router', 'iosxe': 'Router', 'iosxr': 'Router',
            'junos': 'Router',
            'linux': 'Server', 'ubuntu': 'Server', 'debian': 'Server',
            'edgeos': 'Router', 'unifi': 'Wireless',
            'fortios': 'Router',
        }
        
        for dev in librenms_devices:
            os_type = dev.get('os', 'unknown').lower()
            ip_addr = dev.get('ip', dev.get('hostname', ''))
            
            if not ip_addr:
                continue
            
            vendor = os_to_vendor.get(os_type, 'Outro')
            device_type = os_to_type.get(os_type, 'Outro')
            
            device_data = {
                'name': dev.get('sysName') or dev.get('hostname', 'Unknown'),
                'vendor': vendor,
                'device_type': device_type,
                'is_online': dev.get('status', 0) == 1,
                'librenms_id': dev.get('device_id'),
                'model': dev.get('hardware', '') or '',
                'os_version': dev.get('version', '') or '',
                'serial_number': dev.get('serial', '') or '',
                'snmp_community': dev.get('community', 'public'),
            }
            
            device, is_new = Device.objects.update_or_create(
                ip=ip_addr,
                defaults=device_data
            )
            
            if is_new:
                created += 1
            else:
                updated += 1
        
        return JsonResponse({
            'status': 'success',
            'created': created,
            'updated': updated,
            'total': len(librenms_devices)
        })
        
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@csrf_exempt
def api_sync_interfaces(request, device_id):
    """Sincroniza interfaces de um dispositivo do LibreNMS"""
    from .models import Device, DeviceInterface
    from core_system.models import SystemSettings
    
    try:
        device = Device.objects.get(id=device_id)
        
        if not device.librenms_id:
            return JsonResponse({'status': 'error', 'message': 'Dispositivo nao tem LibreNMS ID'}, status=400)
        
        settings = SystemSettings.load()
        if not settings.librenms_enabled:
            return JsonResponse({'status': 'error', 'message': 'LibreNMS desabilitado'}, status=400)
        
        import requests
        headers = {'X-Auth-Token': settings.librenms_api_token}
        
        # Buscar ports do LibreNMS
        response = requests.get(
            f"{settings.librenms_url}/api/v0/devices/{device.librenms_id}/ports",
            headers=headers,
            params={'columns': 'port_id,ifIndex,ifName,ifAlias,ifDescr,ifAdminStatus,ifOperStatus,ifSpeed,ifMtu,ifType,ifInOctets_rate,ifOutOctets_rate'},
            timeout=15
        )
        data = response.json()
        
        if data.get('status') != 'ok':
            return JsonResponse({'status': 'error', 'message': 'Erro ao buscar ports'}, status=500)
        
        ports = data.get('ports', [])
        synced = 0
        
        for port in ports:
            # Pular interfaces virtuais/loopback
            if_name = port.get('ifName', '')
            if not if_name or 'Vlan' in if_name or 'Loop' in if_name or 'Null' in if_name:
                continue
            
            interface, created = DeviceInterface.objects.update_or_create(
                device=device,
                if_index=port.get('ifIndex', 0),
                defaults={
                    'if_name': if_name,
                    'if_alias': port.get('ifAlias', ''),
                    'if_descr': port.get('ifDescr', ''),
                    'if_admin_status': port.get('ifAdminStatus', 'down'),
                    'if_oper_status': port.get('ifOperStatus', 'down'),
                    'if_speed': int(port.get('ifSpeed', 0)),
                    'if_mtu': port.get('ifMtu', 1500),
                    'if_type': port.get('ifType', ''),
                    'traffic_in': int(port.get('ifInOctets_rate', 0) or 0) * 8,  # bits/s
                    'traffic_out': int(port.get('ifOutOctets_rate', 0) or 0) * 8,
                    'librenms_port_id': port.get('port_id'),
                }
            )
            synced += 1
        
        return JsonResponse({
            'status': 'success',
            'device': device.name,
            'interfaces_synced': synced
        })
        
    except Device.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Dispositivo nao encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


def api_device_interfaces(request, device_id):
    """Lista interfaces de um dispositivo"""
    from .models import Device, DeviceInterface
    
    try:
        device = Device.objects.get(id=device_id)
        interfaces = DeviceInterface.objects.filter(device=device)
        
        result = []
        for iface in interfaces:
            result.append({
                'id': iface.id,
                'if_index': iface.if_index,
                'if_name': iface.if_name,
                'if_alias': iface.if_alias or '',
                'if_descr': iface.if_descr or '',
                'admin_status': iface.if_admin_status,
                'oper_status': iface.if_oper_status,
                'speed': iface.if_speed,
                'mtu': iface.if_mtu,
                'traffic_in': iface.traffic_in,
                'traffic_out': iface.traffic_out,
                'has_gbic': iface.has_gbic,
                'gbic_type': iface.gbic_type or '',
                'gbic_vendor': iface.gbic_vendor or '',
                'gbic_serial': iface.gbic_serial or '',
                'gbic_part_number': iface.gbic_part_number or '',
                'gbic_distance': iface.gbic_distance,
                'gbic_temperature': iface.gbic_temperature,
                'gbic_bias_current': iface.gbic_bias_current,
                'rx_power': iface.rx_power,
                'tx_power': iface.tx_power,
                'optical_status': iface.get_optical_status(),
                'last_updated': iface.last_updated.isoformat() if iface.last_updated else None,
            })
        
        return JsonResponse({
            'status': 'success',
            'device': device.name,
            'interfaces': result
        })
        
    except Device.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Dispositivo nao encontrado'}, status=404)


@csrf_exempt
def api_sync_optical(request, device_id):
    """Sincroniza dados opticos (GBIC/SFP) via SNMP"""
    from .models import Device, DeviceInterface
    import subprocess
    
    try:
        device = Device.objects.get(id=device_id)
        interfaces = DeviceInterface.objects.filter(device=device, has_gbic=True)
        
        if not interfaces.exists():
            # Tentar detectar interfaces opticas
            interfaces = DeviceInterface.objects.filter(device=device)
        
        synced = 0
        for iface in interfaces:
            try:
                # OIDs para niveis opticos (padrao SFF-8472)
                # Rx power: 1.3.6.1.4.1.9.9.91.1.1.1.1.4.{ifIndex}
                # Tx power: 1.3.6.1.4.1.9.9.91.1.1.1.1.5.{ifIndex}
                
                # Usar OIDs genericos
                rx_oid = f"1.3.6.1.4.1.9.9.91.1.1.1.1.4.{iface.if_index}"
                tx_oid = f"1.3.6.1.4.1.9.9.91.1.1.1.1.5.{iface.if_index}"
                
                # SNMP get
                cmd = f"snmpget -v2c -c {device.snmp_community} -Oqv {device.ip} {rx_oid} {tx_oid}"
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
                
                output = result.stdout.strip().split('\n')
                if len(output) >= 2:
                    try:
                        # Valores em centésimos de dBm
                        rx = float(output[0]) / 100 if output[0] and output[0] != 'No Such Instance' else None
                        tx = float(output[1]) / 100 if output[1] and output[1] != 'No Such Instance' else None
                        
                        if rx is not None and tx is not None:
                            iface.rx_power = rx
                            iface.tx_power = tx
                            iface.has_gbic = True
                            iface.save()
                            synced += 1
                    except:
                        pass
                        
            except Exception as e:
                continue
        
        return JsonResponse({
            'status': 'success',
            'device': device.name,
            'optical_synced': synced
        })
        
    except Device.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Dispositivo nao encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@csrf_exempt
def api_sync_transceivers(request, device_id):
    """Sincroniza transceivers/GBICs de um dispositivo do LibreNMS"""
    from .models import Device, DeviceInterface
    from core_system.models import SystemSettings
    
    try:
        device = Device.objects.get(id=device_id)
        
        if not device.librenms_id:
            return JsonResponse({'status': 'error', 'message': 'Dispositivo nao tem LibreNMS ID'}, status=400)
        
        settings = SystemSettings.load()
        if not settings.librenms_enabled:
            return JsonResponse({'status': 'error', 'message': 'LibreNMS desabilitado'}, status=400)
        
        import requests
        headers = {'X-Auth-Token': settings.librenms_api_token}
        
        # Buscar transceivers do LibreNMS
        response = requests.get(
            f"{settings.librenms_url}/api/v0/devices/{device.librenms_id}/transceivers",
            headers=headers,
            timeout=15
        )
        data = response.json()
        
        if data.get('status') != 'ok':
            return JsonResponse({'status': 'error', 'message': 'Erro ao buscar transceivers'}, status=500)
        
        transceivers = data.get('transceivers', [])
        synced = 0
        not_found = 0
        
        for trans in transceivers:
            port_id = trans.get('port_id')
            
            try:
                interface = DeviceInterface.objects.get(
                    device=device, 
                    librenms_port_id=port_id
                )
                
                interface.has_gbic = True
                interface.gbic_type = trans.get('type', '')
                interface.gbic_vendor = trans.get('vendor', '')
                interface.gbic_part_number = trans.get('model', '')
                interface.gbic_serial = trans.get('serial', '')
                
                wavelength = trans.get('wavelength')
                if wavelength:
                    interface.gbic_wavelength = f"{wavelength}nm"
                
                ddm = trans.get('ddm')
                if ddm and isinstance(ddm, dict):
                    interface.rx_power = ddm.get('rx_power')
                    interface.tx_power = ddm.get('tx_power')
                
                interface.save()
                synced += 1
                
            except DeviceInterface.DoesNotExist:
                not_found += 1
        
        return JsonResponse({
            'status': 'success',
            'device': device.name,
            'transceivers_synced': synced,
            'ports_not_found': not_found,
            'total_transceivers': len(transceivers)
        })
        
    except Device.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Dispositivo nao encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@csrf_exempt
def api_sync_all_interfaces(request, device_id):
    """Sincroniza interfaces E transceivers de um dispositivo"""
    from .models import Device, DeviceInterface
    from core_system.models import SystemSettings
    
    try:
        device = Device.objects.get(id=device_id)
        
        if not device.librenms_id:
            return JsonResponse({'status': 'error', 'message': 'Dispositivo nao tem LibreNMS ID'}, status=400)
        
        settings = SystemSettings.load()
        if not settings.librenms_enabled:
            return JsonResponse({'status': 'error', 'message': 'LibreNMS desabilitado'}, status=400)
        
        import requests
        headers = {'X-Auth-Token': settings.librenms_api_token}
        base_url = settings.librenms_url
        
        # 1. Buscar ports
        ports_resp = requests.get(
            f"{base_url}/api/v0/devices/{device.librenms_id}/ports",
            headers=headers,
            params={'columns': 'port_id,ifIndex,ifName,ifAlias,ifDescr,ifAdminStatus,ifOperStatus,ifSpeed,ifMtu,ifType,ifInOctets_rate,ifOutOctets_rate,ifInErrors,ifOutErrors'},
            timeout=15
        )
        ports_data = ports_resp.json()
        
        if ports_data.get('status') != 'ok':
            return JsonResponse({'status': 'error', 'message': 'Erro ao buscar ports'}, status=500)
        
        ports = ports_data.get('ports', [])
        interfaces_synced = 0
        port_map = {}
        
        for port in ports:
            if_name = port.get('ifName', '')
            if not if_name or 'Vlan' in if_name or 'Loop' in if_name or 'Null' in if_name or 'InLoop' in if_name:
                continue
            
            interface, created = DeviceInterface.objects.update_or_create(
                device=device,
                if_index=port.get('ifIndex', 0),
                defaults={
                    'if_name': if_name,
                    'if_alias': port.get('ifAlias', ''),
                    'if_descr': port.get('ifDescr', ''),
                    'if_admin_status': port.get('ifAdminStatus', 'down'),
                    'if_oper_status': port.get('ifOperStatus', 'down'),
                    'if_speed': int(port.get('ifSpeed', 0) or 0),
                    'if_mtu': port.get('ifMtu', 1500),
                    'if_type': port.get('ifType', ''),
                    'traffic_in': int(port.get('ifInOctets_rate', 0) or 0) * 8,
                    'traffic_out': int(port.get('ifOutOctets_rate', 0) or 0) * 8,
                    'librenms_port_id': port.get('port_id'),
                }
            )
            port_map[port.get('port_id')] = interface
            interfaces_synced += 1
        
        # 2. Buscar transceivers
        trans_synced = 0
        try:
            trans_resp = requests.get(
                f"{base_url}/api/v0/devices/{device.librenms_id}/transceivers",
                headers=headers,
                timeout=15
            )
            trans_data = trans_resp.json()
            
            if trans_data.get('status') == 'ok':
                for trans in trans_data.get('transceivers', []):
                    port_id = trans.get('port_id')
                    if port_id in port_map:
                        interface = port_map[port_id]
                        interface.has_gbic = True
                        interface.gbic_type = trans.get('type', '')
                        interface.gbic_vendor = trans.get('vendor', '')
                        interface.gbic_part_number = trans.get('model', '')
                        interface.gbic_serial = trans.get('serial', '')
                        
                        wavelength = trans.get('wavelength')
                        if wavelength:
                            interface.gbic_wavelength = f"{wavelength}nm"
                        
                        interface.save()
                        trans_synced += 1
        except Exception as e:
            pass
        
        return JsonResponse({
            'status': 'success',
            'device': device.name,
            'interfaces_synced': interfaces_synced,
            'transceivers_synced': trans_synced
        })
        
    except Device.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Dispositivo nao encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@csrf_exempt
def api_sync_ddm_sensors(request, device_id):
    """Sincroniza dados DDM (temperatura, bias, rx/tx power) dos transceivers"""
    from .models import Device, DeviceInterface
    from core_system.models import SystemSettings
    
    try:
        device = Device.objects.get(id=device_id)
        
        if not device.librenms_id:
            return JsonResponse({'status': 'error', 'message': 'Dispositivo nao tem LibreNMS ID'}, status=400)
        
        settings = SystemSettings.load()
        if not settings.librenms_enabled:
            return JsonResponse({'status': 'error', 'message': 'LibreNMS desabilitado'}, status=400)
        
        import requests
        headers = {'X-Auth-Token': settings.librenms_api_token}
        base_url = settings.librenms_url
        
        synced = 0
        errors = []
        
        # Buscar interfaces com GBIC
        interfaces = DeviceInterface.objects.filter(device=device, has_gbic=True)
        
        if not interfaces.exists():
            return JsonResponse({'status': 'warning', 'message': 'Nenhuma interface com GBIC encontrada'})
        
        # Buscar sensores de dBm (Rx/Tx power)
        try:
            dbm_resp = requests.get(
                f"{base_url}/api/v0/devices/{device.librenms_id}/health/dbm",
                headers=headers,
                timeout=15
            )
            dbm_data = dbm_resp.json()
            
            if dbm_data.get('status') == 'ok':
                for sensor in dbm_data.get('graphs', []):
                    sensor_id = sensor.get('sensor_id')
                    desc = sensor.get('desc', '')
                    
                    # Buscar valor atual do sensor
                    sensor_resp = requests.get(
                        f"{base_url}/api/v0/devices/{device.librenms_id}/health/dbm/{sensor_id}",
                        headers=headers,
                        timeout=10
                    )
                    sensor_data = sensor_resp.json()
                    
                    if sensor_data.get('status') == 'ok' and sensor_data.get('graphs'):
                        sensor_info = sensor_data['graphs'][0]
                        current_value = sensor_info.get('sensor_current')
                        ent_physical_index = sensor_info.get('entPhysicalIndex')
                        
                        # Identificar se é Rx ou Tx
                        desc_lower = desc.lower()
                        
                        # Buscar interface pelo entPhysicalIndex ou descrição
                        for iface in interfaces:
                            iface_name = iface.if_name.split('.')[0]  # Remover subinterface
                            if iface_name in desc or str(iface.if_index) == str(ent_physical_index):
                                if 'rx' in desc_lower:
                                    iface.rx_power = current_value
                                elif 'tx' in desc_lower:
                                    iface.tx_power = current_value
                                iface.save()
                                synced += 1
                                break
        except Exception as e:
            errors.append(f"Erro dBm: {str(e)}")
        
        # Buscar sensores de temperatura
        try:
            temp_resp = requests.get(
                f"{base_url}/api/v0/devices/{device.librenms_id}/health/temperature",
                headers=headers,
                timeout=15
            )
            temp_data = temp_resp.json()
            
            if temp_data.get('status') == 'ok':
                for sensor in temp_data.get('graphs', []):
                    sensor_id = sensor.get('sensor_id')
                    desc = sensor.get('desc', '')
                    
                    # Verificar se é transceiver (group = transceiver)
                    sensor_resp = requests.get(
                        f"{base_url}/api/v0/devices/{device.librenms_id}/health/temperature/{sensor_id}",
                        headers=headers,
                        timeout=10
                    )
                    sensor_data = sensor_resp.json()
                    
                    if sensor_data.get('status') == 'ok' and sensor_data.get('graphs'):
                        sensor_info = sensor_data['graphs'][0]
                        
                        # Só processar se for do grupo transceiver
                        if sensor_info.get('group') == 'transceiver':
                            current_value = sensor_info.get('sensor_current')
                            ent_physical_index = sensor_info.get('entPhysicalIndex')
                            
                            for iface in interfaces:
                                iface_name = iface.if_name.split('.')[0]
                                if iface_name in desc or str(iface.if_index) == str(ent_physical_index):
                                    iface.gbic_temperature = current_value
                                    iface.save()
                                    synced += 1
                                    break
        except Exception as e:
            errors.append(f"Erro temperatura: {str(e)}")
        
        # Buscar sensores de corrente (bias)
        try:
            current_resp = requests.get(
                f"{base_url}/api/v0/devices/{device.librenms_id}/health/current",
                headers=headers,
                timeout=15
            )
            current_data = current_resp.json()
            
            if current_data.get('status') == 'ok':
                for sensor in current_data.get('graphs', []):
                    sensor_id = sensor.get('sensor_id')
                    desc = sensor.get('desc', '')
                    
                    sensor_resp = requests.get(
                        f"{base_url}/api/v0/devices/{device.librenms_id}/health/current/{sensor_id}",
                        headers=headers,
                        timeout=10
                    )
                    sensor_data = sensor_resp.json()
                    
                    if sensor_data.get('status') == 'ok' and sensor_data.get('graphs'):
                        sensor_info = sensor_data['graphs'][0]
                        
                        if sensor_info.get('group') == 'transceiver':
                            current_value = sensor_info.get('sensor_current')
                            ent_physical_index = sensor_info.get('entPhysicalIndex')
                            
                            for iface in interfaces:
                                iface_name = iface.if_name.split('.')[0]
                                if iface_name in desc or str(iface.if_index) == str(ent_physical_index):
                                    iface.gbic_bias_current = current_value
                                    iface.save()
                                    synced += 1
                                    break
        except Exception as e:
            errors.append(f"Erro corrente: {str(e)}")
        
        return JsonResponse({
            'status': 'success',
            'device': device.name,
            'sensors_synced': synced,
            'errors': errors
        })
        
    except Device.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Dispositivo nao encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
