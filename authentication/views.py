import json
import requests
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.contrib.auth.decorators import login_required

from .models import UserProfile, ExternalSystemUser

# Configuracoes dos sistemas externos
EXTERNAL_SYSTEMS = {
    'librenms': {'url': 'http://127.0.0.1:8081', 'api_token': 'your_token'},
    'phpipam': {'url': 'http://127.0.0.1:9100', 'app_id': 'lorcgr', 'api_key': 'your_key'},
    'zabbix': {'url': 'http://127.0.0.1:8080', 'api_token': 'your_token'},
    'grafana': {'url': 'http://127.0.0.1:3000', 'admin_user': 'admin', 'admin_pass': 'Lor#Vision#2016'},
}

@csrf_exempt
@require_POST
def api_login(request):
    try:
        data = json.loads(request.body)
        username = data.get('username', '')
        password = data.get('password', '')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            return JsonResponse({
                'authenticated': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_superuser': user.is_superuser,
                    'role': profile.role,
                    'permissions': {
                        'can_delete': profile.can_delete,
                        'can_edit': profile.can_edit,
                        'can_create': profile.can_create,
                        'can_access_terminal': profile.can_access_terminal,
                        'can_access_backups': profile.can_access_backups,
                        'can_access_integrations': profile.can_access_integrations,
                    }
                }
            })
        else:
            return JsonResponse({'authenticated': False, 'error': 'Usuario ou senha invalidos'}, status=401)
    except Exception as e:
        return JsonResponse({'authenticated': False, 'error': str(e)}, status=400)

@require_GET
def check_auth(request):
    if request.user.is_authenticated:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return JsonResponse({
            'authenticated': True,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'is_superuser': request.user.is_superuser,
                'role': profile.role,
                'permissions': {
                    'can_delete': profile.can_delete,
                    'can_edit': profile.can_edit,
                    'can_create': profile.can_create,
                    'can_access_terminal': profile.can_access_terminal,
                    'can_access_backups': profile.can_access_backups,
                    'can_access_integrations': profile.can_access_integrations,
                }
            }
        })
    return JsonResponse({'authenticated': False})

@require_POST
@csrf_exempt
def api_logout(request):
    logout(request)
    return JsonResponse({'success': True})

@require_POST
@csrf_exempt
@login_required
def create_user(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email', '')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        role = data.get('role', 'convidado')
        
        profile = request.user.profile
        if not profile.can_create and not request.user.is_superuser:
            return JsonResponse({'error': 'Sem permissao'}, status=403)
        
        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Usuario ja existe'}, status=400)
        
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        
        user_profile = UserProfile.objects.create(user=user, role=role)
        
        # Criar usuarios nos sistemas externos
        results = create_external_users(user, password)
        
        return JsonResponse({
            'success': True,
            'user_id': user.id,
            'external_sync': results
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

def create_external_users(user, password):
    results = {}
    
    # LibreNMS
    try:
        cfg = EXTERNAL_SYSTEMS['librenms']
        resp = requests.post(f"{cfg['url']}/api/v0/users", json={
            'username': user.username,
            'password': password,
            'email': user.email,
            'realname': f"{user.first_name} {user.last_name}",
        }, headers={'X-Auth-Token': cfg['api_token']}, timeout=10)
        
        if resp.status_code in [200, 201]:
            ExternalSystemUser.objects.create(
                user=user, system='librenms',
                external_username=user.username,
                sync_status='success'
            )
            results['librenms'] = 'created'
        else:
            results['librenms'] = f'error: {resp.text[:100]}'
    except Exception as e:
        results['librenms'] = f'error: {str(e)[:50]}'
    
    # Grafana
    try:
        cfg = EXTERNAL_SYSTEMS['grafana']
        resp = requests.post(f"{cfg['url']}/api/admin/users", json={
            'name': user.username,
            'email': user.email,
            'login': user.username,
            'password': password,
        }, auth=(cfg['admin_user'], cfg['admin_pass']), timeout=10)
        
        if resp.status_code in [200, 201]:
            data = resp.json()
            ExternalSystemUser.objects.create(
                user=user, system='grafana',
                external_username=user.username,
                external_user_id=str(data.get('id', '')),
                sync_status='success'
            )
            results['grafana'] = 'created'
        else:
            results['grafana'] = f'error: {resp.text[:100]}'
    except Exception as e:
        results['grafana'] = f'error: {str(e)[:50]}'
    
    # phpIPAM e Zabbix podem ser adicionados similarmente
    results['phpipam'] = 'not_implemented'
    results['zabbix'] = 'not_implemented'
    
    return results

@require_GET
@login_required
def list_users(request):
    users = User.objects.all().select_related('profile')
    data = []
    for u in users:
        try:
            data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'is_active': u.is_active,
                'role': u.profile.role,
                'can_delete': u.profile.can_delete,
                'can_edit': u.profile.can_edit,
            })
        except:
            pass
    return JsonResponse({'users': data})

@require_POST
@csrf_exempt
@login_required
def delete_user(request, user_id):
    if not request.user.profile.can_delete and not request.user.is_superuser:
        return JsonResponse({'error': 'Sem permissao'}, status=403)
    
    try:
        user = User.objects.get(id=user_id)
        if user == request.user:
            return JsonResponse({'error': 'Nao pode excluir a si mesmo'}, status=400)
        
        # Deletar usuarios externos
        for ext in ExternalSystemUser.objects.filter(user=user):
            delete_external_user(ext)
        
        user.delete()
        return JsonResponse({'success': True})
    except User.DoesNotExist:
        return JsonResponse({'error': 'Usuario nao encontrado'}, status=404)

def delete_external_user(ext_user):
    try:
        if ext_user.system == 'grafana':
            if ext_user.external_user_id:
                cfg = EXTERNAL_SYSTEMS['grafana']
                requests.delete(
                    f"{cfg['url']}/api/admin/users/{ext_user.external_user_id}",
                    auth=(cfg['admin_user'], cfg['admin_pass']),
                    timeout=10
                )
    except:
        pass
