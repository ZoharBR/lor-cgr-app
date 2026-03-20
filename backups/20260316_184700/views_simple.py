import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection

def api_list_devices(request):
    """Lista dispositivos usando SQL direto para evitar problemas com model"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, name, ip, vendor, model, is_online, protocol, port, 
                   username, password, is_bras, backup_enabled, created_at, updated_at,
                   ssh_user, ssh_password, ssh_port, location
            FROM devices ORDER BY id
        """)
        columns = [col[0] for col in cursor.description]
        devices = [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]
        
        # Formatar para o frontend
        result = []
        for d in devices:
            result.append({
                'id': d['id'],
                'hostname': d['name'],
                'ip_address': str(d['ip']),
                'vendor': d['vendor'] or '',
                'device_type': 'bras' if d['is_bras'] else 'router',
                'model': d['model'] or '',
                'is_online': d['is_online'],
                'is_bras': d['is_bras'],
                'port': d['port'] or 22,
                'username': d['username'] or d['ssh_user'] or '',
                'password': d['password'] or d['ssh_password'] or '',
                'protocol': d['protocol'] or 'ssh',
                'backup_enabled': d['backup_enabled'],
            })
        return JsonResponse(result, safe=False)

def api_dashboard_stats(request):
    """Dashboard stats"""
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM devices")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM devices WHERE is_online = true")
        online = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM devices WHERE is_bras = true")
        bras = cursor.fetchone()[0]
    
    return JsonResponse({
        'devices_total': total,
        'devices_online': online,
        'devices_offline': total - online,
        'bras_count': bras,
        'pppoe_total': 0,
        'server_health': {'cpu': 0, 'ram': 0, 'disk': 0},
    })

@csrf_exempt  
def api_save_device(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            with connection.cursor() as cursor:
                if data.get('id'):
                    # Update
                    cursor.execute("""
                        UPDATE devices SET 
                        name = %s, ip = %s, vendor = %s, model = %s,
                        port = %s, username = %s, password = %s, is_bras = %s,
                        updated_at = NOW()
                        WHERE id = %s
                    """, [
                        data.get('hostname', ''),
                        data.get('ip_address', ''),
                        data.get('vendor', ''),
                        data.get('model', ''),
                        data.get('port', 22),
                        data.get('username', ''),
                        data.get('password', ''),
                        data.get('is_bras', False),
                        data.get('id')
                    ])
                else:
                    # Insert
                    cursor.execute("""
                        INSERT INTO devices (name, ip, vendor, model, port, username, password, is_bras, is_online, backup_enabled, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, false, true, NOW(), NOW())
                    """, [
                        data.get('hostname', ''),
                        data.get('ip_address', ''),
                        data.get('vendor', ''),
                        data.get('model', ''),
                        data.get('port', 22),
                        data.get('username', ''),
                        data.get('password', ''),
                        data.get('is_bras', False),
                    ])
            return JsonResponse({'status': 'success'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def api_delete_device(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM devices WHERE id = %s", [data.get('id')])
            return JsonResponse({'status': 'success'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

def api_interfaces_stats(request):
    """DDM/Interface stats - retorna dados vazios por enquanto"""
    return JsonResponse({
        'status': 'success',
        'total_transceivers': 0,
        'avg_temperature': 0,
        'avg_rx_power': 0,
        'avg_tx_power': 0,
        'alerts': {'critical': 0, 'warning': 0, 'normal': 0},
    })

# APIs adicionais que o frontend pode precisar
def api_device_types(request):
    return JsonResponse([
        {'value': 'router', 'label': 'Router'},
        {'value': 'bras', 'label': 'BRAS/PPPoE'},
        {'value': 'switch', 'label': 'Switch'},
        {'value': 'olt', 'label': 'OLT'},
    ], safe=False)

def api_discovery(request):
    return JsonResponse({'status': 'success', 'devices': []})

def api_icmp_check(request, device_id=None):
    return JsonResponse({'status': 'success', 'online': True, 'latency': 0})

def api_backup_list(request):
    return JsonResponse([], safe=False)

def api_backup_run(request):
    return JsonResponse({'status': 'success'})

def api_audit_logs(request):
    return JsonResponse([], safe=False)
