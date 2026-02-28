from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User, Group
import json
from .models import UserProfile, UserAccessLog

ROLE_LABELS = {
    'admin': 'Admin',
    'noc': 'NOC', 
    'leitura': 'Leitura'
}

def log_action(user, action, desc, request=None, details=None):
    UserAccessLog.objects.create(user=user, username=(user.username if user else 'anon'), action=action, description=desc, ip_address=(request.META.get('REMOTE_ADDR') if request else None), details=(details or {}))

def get_user_role(user):
    if not user or not user.is_authenticated:
        return 'leitura'
    profile = getattr(user, 'profile', None)
    if profile:
        return profile.role
    return 'leitura'

@csrf_exempt
@require_http_methods(['GET'])
def api_list_users(request):
    users = User.objects.all().order_by('-date_joined')
    data = []
    for u in users:
        p = getattr(u, 'profile', None)
        role = p.role if p else 'leitura'
        data.append({
            'id': u.id, 
            'username': u.username, 
            'email': u.email, 
            'first_name': u.first_name, 
            'last_name': u.last_name, 
            'full_name': u.get_full_name(), 
            'is_active': u.is_active, 
            'is_staff': u.is_staff, 
            'is_superuser': u.is_superuser, 
            'date_joined': u.date_joined.isoformat(), 
            'last_login': (u.last_login.isoformat() if u.last_login else None), 
            'phone': (p.phone if p else None), 
            'department': (p.department if p else None),
            'role': role,
            'role_label': ROLE_LABELS.get(role, 'Leitura'),
            'librenms_id': (p.librenms_user_id if p else None), 
            'phpipam_id': (p.phpipam_user_id if p else None), 
            'groups': list(u.groups.values_list('name', flat=True))
        })
    return JsonResponse({'users': data, 'total': len(data)})

@csrf_exempt
@require_http_methods(['GET'])
def api_get_user(request, user_id):
    try:
        u = User.objects.get(id=user_id)
        p = getattr(u, 'profile', None)
        logs = UserAccessLog.objects.filter(username=u.username).order_by('-created_at')[:20]
        logs_data = [{'id': l.id, 'action': l.action, 'description': l.description, 'ip_address': l.ip_address, 'created_at': l.created_at.isoformat()} for l in logs]
        role = p.role if p else 'leitura'
        return JsonResponse({
            'user': {
                'id': u.id, 
                'username': u.username, 
                'email': u.email, 
                'first_name': u.first_name, 
                'last_name': u.last_name, 
                'is_active': u.is_active, 
                'is_staff': u.is_staff, 
                'is_superuser': u.is_superuser, 
                'date_joined': u.date_joined.isoformat(), 
                'last_login': (u.last_login.isoformat() if u.last_login else None), 
                'phone': (p.phone if p else None), 
                'department': (p.department if p else None),
                'role': role,
                'role_label': ROLE_LABELS.get(role, 'Leitura'),
                'groups': list(u.groups.values_list('name', flat=True))
            }, 
            'logs': logs_data
        })
    except User.DoesNotExist:
        return JsonResponse({'error': 'Usuario nao encontrado'}, status=404)

@csrf_exempt
@require_http_methods(['POST'])
def api_create_user(request):
    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({'error': 'JSON invalido'}, status=400)
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'leitura')
    if not username or not password:
        return JsonResponse({'error': 'Username e senha obrigatorios'}, status=400)
    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'Username ja existe'}, status=400)
    user = User.objects.create_user(
        username, 
        data.get('email') or None, 
        password, 
        first_name=data.get('first_name', ''), 
        last_name=data.get('last_name', ''), 
        is_staff=(role in ['admin', 'noc']), 
        is_superuser=(role == 'admin')
    )
    p, _ = UserProfile.objects.get_or_create(user=user)
    p.role = role
    p.phone = data.get('phone', '')
    p.department = data.get('department', '')
    p.save()
    log_action(None, 'create_user', 'Criou usuario ' + username, request)
    return JsonResponse({'success': True, 'message': 'Usuario ' + username + ' criado', 'user_id': user.id})

@csrf_exempt
@require_http_methods(['PUT'])
def api_update_user(request, user_id):
    try:
        u = User.objects.get(id=user_id)
    except:
        return JsonResponse({'error': 'Usuario nao encontrado'}, status=404)
    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({'error': 'JSON invalido'}, status=400)
    if 'email' in data:
        u.email = data['email']
    if 'first_name' in data:
        u.first_name = data['first_name']
    if 'last_name' in data:
        u.last_name = data['last_name']
    if 'is_active' in data:
        u.is_active = data['is_active']
    role = data.get('role', 'leitura')
    u.is_staff = role in ['admin', 'noc']
    u.is_superuser = role == 'admin'
    u.save()
    p, _ = UserProfile.objects.get_or_create(user=u)
    p.role = role
    if 'phone' in data:
        p.phone = data['phone']
    if 'department' in data:
        p.department = data['department']
    p.save()
    log_action(None, 'update_user', 'Atualizou usuario ' + u.username, request)
    return JsonResponse({'success': True, 'message': 'Usuario ' + u.username + ' atualizado'})

@csrf_exempt
@require_http_methods(['DELETE'])
def api_delete_user(request, user_id):
    try:
        u = User.objects.get(id=user_id)
        username = u.username
        log_action(None, 'delete_user', 'Deletou usuario ' + username, request)
        u.delete()
        return JsonResponse({'success': True, 'message': 'Usuario ' + username + ' removido'})
    except:
        return JsonResponse({'error': 'Usuario nao encontrado'}, status=404)

@csrf_exempt
@require_http_methods(['POST'])
def api_change_password(request, user_id):
    try:
        u = User.objects.get(id=user_id)
    except:
        return JsonResponse({'error': 'Usuario nao encontrado'}, status=404)
    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({'error': 'JSON invalido'}, status=400)
    pwd = data.get('new_password', '').strip()
    if len(pwd) < 6:
        return JsonResponse({'error': 'Senha deve ter 6+ caracteres'}, status=400)
    u.set_password(pwd)
    u.save()
    log_action(None, 'change_password', 'Alterou senha de ' + u.username, request)
    return JsonResponse({'success': True, 'message': 'Senha alterada'})

@csrf_exempt
@require_http_methods(['GET'])
def api_list_logs(request):
    logs = UserAccessLog.objects.all().order_by('-created_at')[:100]
    data = [{'id': l.id, 'username': l.username, 'action': l.action, 'description': l.description, 'ip_address': l.ip_address, 'created_at': l.created_at.isoformat(), 'details': l.details} for l in logs]
    return JsonResponse({'logs': data, 'total': len(data)})

@csrf_exempt
@require_http_methods(['DELETE'])
def api_delete_log(request, log_id):
    try:
        UserAccessLog.objects.get(id=log_id).delete()
        return JsonResponse({'success': True})
    except:
        return JsonResponse({'error': 'Log nao encontrado'}, status=404)

@csrf_exempt
@require_http_methods(['DELETE'])
def api_clear_logs(request):
    count = UserAccessLog.objects.count()
    UserAccessLog.objects.all().delete()
    return JsonResponse({'success': True, 'message': str(count) + ' logs removidos'})

@csrf_exempt
@require_http_methods(['GET'])
def api_export_logs(request):
    logs = UserAccessLog.objects.all().order_by('-created_at')
    lines = ['ID,Usuario,Acao,Descricao,IP,Data/Hora']
    for l in logs:
        dt = l.created_at.strftime('%d/%m/%Y %H:%M:%S')
        lines.append(str(l.id) + ',"' + l.username + '","' + l.action + '","' + l.description + '","' + (l.ip_address or '') + '","' + dt + '"')
    response = HttpResponse('\n'.join(lines), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=logs_lorcgr.csv'
    return response
