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
