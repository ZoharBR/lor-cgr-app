from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.utils import timezone
from .models import UserAccessLog, UserProfile, UserRole
import csv
import json

@api_view(['GET'])
def list_logs(request):
    """Lista logs com paginação e filtros"""
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', 50))
    action_filter = request.GET.get('action', '')
    user_id = request.GET.get('userId', '')
    start_date = request.GET.get('startDate', '')
    end_date = request.GET.get('endDate', '')
    
    logs = UserAccessLog.objects.select_related('user', 'user__profile').all()
    
    if action_filter:
        logs = logs.filter(action__icontains=action_filter)
    if user_id:
        logs = logs.filter(user_id=user_id)
    if start_date:
        logs = logs.filter(created_at__gte=start_date)
    if end_date:
        logs = logs.filter(created_at__lte=end_date)
    
    total = logs.count()
    total_pages = (total + limit - 1) // limit
    offset = (page - 1) * limit
    
    logs = logs[offset:offset + limit]
    
    data = []
    for log in logs:
        profile = getattr(log.user, 'profile', None)
        item = {
            'id': log.id,
            'userId': log.user_id,
            'user': {
                'id': log.user.id,
                'name': log.user.get_full_name() or log.user.username,
                'email': log.user.email,
                'role': profile.role if profile else 'NOC',
                'avatar': profile.avatar if profile else None,
            },
            'action': log.action,
            'description': log.description,
            'ipAddress': log.ip_address,
            'userAgent': log.user_agent,
            'metadata': log.metadata,
            'createdAt': log.created_at.isoformat(),
        }
        # Campos SSH
        if log.action == 'SSH_COMMAND':
            item['sshCommand'] = log.ssh_command
            item['sshOutput'] = log.ssh_output
            item['sshDevice'] = log.ssh_device
            item['sshSuccess'] = log.ssh_success
        data.append(item)
    
    return Response({
        'success': True,
        'data': data,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'totalPages': total_pages,
        }
    })

@api_view(['GET'])
def get_log_detail(request, log_id):
    """Detalhes de um log específico"""
    try:
        log = UserAccessLog.objects.select_related('user', 'user__profile').get(id=log_id)
        profile = getattr(log.user, 'profile', None)
        
        data = {
            'id': log.id,
            'userId': log.user_id,
            'user': {
                'id': log.user.id,
                'name': log.user.get_full_name() or log.user.username,
                'email': log.user.email,
                'role': profile.role if profile else 'NOC',
                'avatar': profile.avatar if profile else None,
            },
            'action': log.action,
            'description': log.description,
            'ipAddress': log.ip_address,
            'userAgent': log.user_agent,
            'metadata': log.metadata,
            'createdAt': log.created_at.isoformat(),
        }
        
        # Campos SSH completos
        if log.action == 'SSH_COMMAND':
            data['sshCommand'] = log.ssh_command
            data['sshOutput'] = log.ssh_output
            data['sshDevice'] = log.ssh_device
            data['sshSuccess'] = log.ssh_success
        
        return Response({'success': True, 'data': data})
    except UserAccessLog.DoesNotExist:
        return Response({'success': False, 'error': 'Log não encontrado'}, status=404)

@api_view(['DELETE'])
def delete_log(request):
    """Deleta um log (somente Admin)"""
    log_id = request.GET.get('id')
    if not log_id:
        return Response({'success': False, 'error': 'Log ID is required'}, status=400)
    
    # Verificar se é admin
    profile = getattr(request.user, 'profile', None)
    if not profile or profile.role != UserRole.ADMIN:
        return Response({'success': False, 'error': 'Apenas administradores podem excluir logs'}, status=403)
    
    try:
        log = UserAccessLog.objects.get(id=log_id)
        log.delete()
        return Response({'success': True, 'message': 'Log deleted successfully'})
    except UserAccessLog.DoesNotExist:
        return Response({'success': False, 'error': 'Log not found'}, status=404)

@api_view(['GET'])
def export_logs(request):
    """Exporta logs em JSON ou CSV"""
    format_type = request.GET.get('format', 'json')
    action_filter = request.GET.get('action', '')
    user_id = request.GET.get('userId', '')
    start_date = request.GET.get('startDate', '')
    end_date = request.GET.get('endDate', '')
    
    logs = UserAccessLog.objects.select_related('user', 'user__profile').all()
    
    if action_filter:
        logs = logs.filter(action__icontains=action_filter)
    if user_id:
        logs = logs.filter(user_id=user_id)
    if start_date:
        logs = logs.filter(created_at__gte=start_date)
    if end_date:
        logs = logs.filter(created_at__lte=end_date)
    
    logs = logs.order_by('-created_at')
    
    if format_type == 'csv':
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="logs_{timezone.now().date()}.csv"'
        
        writer = csv.writer(response, delimiter=';')
        writer.writerow(['ID', 'Data/Hora', 'Usuário', 'Email', 'Role', 'Ação', 'Descrição', 'IP', 'Comando SSH', 'Dispositivo SSH', 'Sucesso'])
        
        for log in logs:
            profile = getattr(log.user, 'profile', None)
            writer.writerow([
                log.id,
                log.created_at.isoformat(),
                log.user.get_full_name() or log.user.username,
                log.user.email,
                profile.role if profile else 'NOC',
                log.action,
                log.description,
                log.ip_address or '',
                log.ssh_command or '',
                log.ssh_device or '',
                'Sim' if log.ssh_success else 'Não' if log.ssh_command else '',
            ])
        
        return response
    else:
        data = []
        for log in logs:
            profile = getattr(log.user, 'profile', None)
            item = {
                'id': log.id,
                'createdAt': log.created_at.isoformat(),
                'user': {
                    'name': log.user.get_full_name() or log.user.username,
                    'email': log.user.email,
                    'role': profile.role if profile else 'NOC',
                },
                'action': log.action,
                'description': log.description,
                'ipAddress': log.ip_address,
                'sshCommand': log.ssh_command,
                'sshOutput': log.ssh_output,
                'sshDevice': log.ssh_device,
                'sshSuccess': log.ssh_success,
            }
            data.append(item)
        
        response = HttpResponse(json.dumps(data, indent=2, ensure_ascii=False), content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename="logs_{timezone.now().date()}.json"'
        return response

@api_view(['GET'])
def list_users(request):
    """Lista todos os usuários"""
    users = User.objects.select_related('profile').all()
    data = []
    for user in users:
        profile = getattr(user, 'profile', None)
        data.append({
            'id': user.id,
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'role': profile.role if profile else 'NOC',
            'avatar': profile.avatar if profile else None,
            'active': user.is_active,
        })
    return Response({'success': True, 'data': data})

@api_view(['POST'])
def seed_logs(request):
    """Popula banco com logs de exemplo"""
    import random
    from datetime import timedelta
    
    users = list(User.objects.all())
    if not users:
        return Response({'success': False, 'error': 'No users found'}, status=400)
    
    actions = [
        ('DEVICE_CREATED', 'Novo dispositivo RTR-CORE-01 criado'),
        ('DEVICE_UPDATED', 'Dispositivo SW-ACCESS-25 atualizado'),
        ('DEVICE_DELETED', 'Dispositivo OLD-SW-01 removido'),
        ('SSH_COMMAND', 'Comando SSH executado'),
        ('AI_CHAT', 'Consulta ao assistente IA sobre status da rede'),
        ('USER_LOGIN', 'Login realizado com sucesso'),
        ('USER_LOGOUT', 'Logout realizado'),
        ('CONFIG_BACKUP', 'Backup de configuração executado'),
        ('ALERT_CREATED', 'Alerta criado para interface down'),
        ('REPORT_GENERATED', 'Relatório mensal gerado'),
    ]
    
    ssh_commands = [
        ('show interface status', 'Port    Name               Status       Vlan       Duplex  Speed Type\nFa0/1   PC-01              connected    10         full    100   10/100BaseTX\nFa0/2   PC-02              notconnect  20         auto    auto  10/100BaseTX'),
        ('show ip route', 'Codes: C - connected, S - static, R - RIP\nC    192.168.1.0/24 is directly connected, Vlan1\nS    0.0.0.0/0 [1/0] via 192.168.1.1'),
        ('show version', 'Cisco IOS Software, Version 15.2(4)M\nRouter uptime is 2 weeks, 3 days\nSystem returned to ROM by power-on'),
        ('show running-config', 'Building configuration...\nhostname RTR-CORE-01\ninterface GigabitEthernet0/0\n ip address 192.168.1.1 255.255.255.0'),
    ]
    
    logs_created = 0
    for i in range(50):
        user = random.choice(users)
        action_data = random.choice(actions)
        random_date = timezone.now() - timedelta(
            days=random.randint(0, 30),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )
        
        # Se for SSH, adiciona dados do comando
        ssh_cmd = None
        ssh_out = None
        ssh_dev = None
        ssh_ok = True
        
        if action_data[0] == 'SSH_COMMAND':
            cmd_data = random.choice(ssh_commands)
            ssh_cmd = cmd_data[0]
            ssh_out = cmd_data[1]
            ssh_dev = random.choice(['RTR-CORE-01 (192.168.1.1)', 'SW-ACCESS-25 (192.168.1.25)', 'SW-DIST-01 (192.168.1.2)'])
            ssh_ok = random.choice([True, True, True, False])  # 75% sucesso
        
        UserAccessLog.objects.create(
            user=user,
            action=action_data[0],
            description=action_data[1],
            ip_address=f'192.168.{random.randint(1, 255)}.{random.randint(1, 255)}',
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            created_at=random_date,
            ssh_command=ssh_cmd,
            ssh_output=ssh_out,
            ssh_device=ssh_dev,
            ssh_success=ssh_ok,
        )
        logs_created += 1
    
    return Response({
        'success': True,
        'message': f'{logs_created} logs created',
    })
