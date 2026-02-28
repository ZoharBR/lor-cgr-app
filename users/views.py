from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from .models import UserProfile, UserRole, UserAccessLog
import csv
import json

def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')

# ===================== LOGS =====================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_list_logs(request):
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
    total_pages = (total + limit - 1) // limit if total > 0 else 1
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
                'username': log.user.username,
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
        if log.action in ['SSH_COMMAND', 'SSH_CONNECT', 'SSH_DISCONNECT', 'SSH_ERROR']:
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
@permission_classes([AllowAny])
def api_get_log_detail(request, log_id):
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
                'username': log.user.username,
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
        if log.action in ['SSH_COMMAND', 'SSH_CONNECT', 'SSH_DISCONNECT', 'SSH_ERROR']:
            data['sshCommand'] = log.ssh_command
            data['sshOutput'] = log.ssh_output
            data['sshDevice'] = log.ssh_device
            data['sshSuccess'] = log.ssh_success
        
        return Response({'success': True, 'data': data})
    except UserAccessLog.DoesNotExist:
        return Response({'success': False, 'error': 'Log nao encontrado'}, status=404)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def api_delete_log(request, log_id):
    """Deleta um log (somente Admin)"""
    if request.user.is_authenticated:
        profile = getattr(request.user, 'profile', None)
        if not profile or profile.role != UserRole.ADMIN:
            return Response({'success': False, 'error': 'Apenas administradores podem excluir logs'}, status=403)
    
    try:
        log = UserAccessLog.objects.get(id=log_id)
        log.delete()
        return Response({'success': True, 'message': 'Log excluido com sucesso'})
    except UserAccessLog.DoesNotExist:
        return Response({'success': False, 'error': 'Log nao encontrado'}, status=404)

@api_view(['POST'])
@permission_classes([AllowAny])
def api_clear_logs(request):
    """Limpa todos os logs (somente Admin)"""
    if request.user.is_authenticated:
        profile = getattr(request.user, 'profile', None)
        if not profile or profile.role != UserRole.ADMIN:
            return Response({'success': False, 'error': 'Apenas administradores podem limpar logs'}, status=403)
    
    count = UserAccessLog.objects.count()
    UserAccessLog.objects.all().delete()
    return Response({'success': True, 'message': f'{count} logs removidos'})

@api_view(['GET'])
@permission_classes([AllowAny])
def api_export_logs(request):
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
        writer.writerow(['ID', 'Data/Hora', 'Usuario', 'Email', 'Role', 'Acao', 'Descricao', 'IP', 'Comando SSH', 'Dispositivo SSH', 'Sucesso'])
        
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
                'Sim' if log.ssh_success else ('Nao' if log.ssh_command else ''),
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
                    'username': log.user.username,
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

# ===================== USUARIOS =====================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_list_users(request):
    """Lista todos os usuarios"""
    users = User.objects.select_related('profile').all()
    data = []
    for user in users:
        profile = getattr(user, 'profile', None)
        data.append({
            'id': user.id,
            'username': user.username,
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'role': profile.role if profile else 'NOC',
            'avatar': profile.avatar if profile else None,
            'phone': profile.phone if profile else '',
            'active': user.is_active,
            'is_superuser': user.is_superuser,
        })
    return Response({'success': True, 'data': data})

@api_view(['POST'])
@permission_classes([AllowAny])
def api_create_user(request):
    """Cria novo usuario"""
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    name = request.data.get('name', '')
    email = request.data.get('email', '')
    role = request.data.get('role', 'NOC')
    phone = request.data.get('phone', '')
    
    if not username or not password:
        return Response({'success': False, 'error': 'Usuario e senha sao obrigatorios'}, status=400)
    
    if User.objects.filter(username=username).exists():
        return Response({'success': False, 'error': 'Usuario ja existe'}, status=400)
    
    user = User.objects.create_user(username=username, password=password, email=email, first_name=name)
    profile = UserProfile.objects.create(user=user, role=role, phone=phone)
    
    # Log
    if request.user.is_authenticated:
        UserAccessLog.objects.create(
            user=request.user,
            action='USER_CREATED',
            description=f'Usuario {username} criado com role {role}',
            ip_address=get_client_ip(request),
        )
    
    return Response({
        'success': True,
        'data': {
            'id': user.id,
            'username': user.username,
            'name': user.first_name,
            'email': user.email,
            'role': profile.role,
            'phone': profile.phone,
        }
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def api_get_user(request, user_id):
    """Detalhes de um usuario"""
    try:
        user = User.objects.select_related('profile').get(id=user_id)
        profile = getattr(user, 'profile', None)
        return Response({
            'success': True,
            'data': {
                'id': user.id,
                'username': user.username,
                'name': user.first_name,
                'email': user.email,
                'role': profile.role if profile else 'NOC',
                'avatar': profile.avatar if profile else None,
                'phone': profile.phone if profile else '',
                'active': user.is_active,
            }
        })
    except User.DoesNotExist:
        return Response({'success': False, 'error': 'Usuario nao encontrado'}, status=404)

@api_view(['PUT'])
@permission_classes([AllowAny])
def api_update_user(request, user_id):
    """Atualiza usuario"""
    try:
        user = User.objects.get(id=user_id)
        profile = getattr(user, 'profile', None) or UserProfile.objects.create(user=user)
        
        if request.data.get('name'):
            user.first_name = request.data['name']
        if request.data.get('email'):
            user.email = request.data['email']
        if request.data.get('role'):
            profile.role = request.data['role']
        if request.data.get('phone') is not None:
            profile.phone = request.data.get('phone', '')
        if request.data.get('active') is not None:
            user.is_active = request.data['active']
        
        user.save()
        profile.save()
        
        return Response({'success': True, 'message': 'Usuario atualizado'})
    except User.DoesNotExist:
        return Response({'success': False, 'error': 'Usuario nao encontrado'}, status=404)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def api_delete_user(request, user_id):
    """Deleta usuario (somente Admin)"""
    if request.user.is_authenticated:
        profile = getattr(request.user, 'profile', None)
        if not profile or profile.role != UserRole.ADMIN:
            return Response({'success': False, 'error': 'Apenas administradores podem excluir usuarios'}, status=403)
    
    try:
        user = User.objects.get(id=user_id)
        username = user.username
        user.delete()
        
        if request.user.is_authenticated:
            UserAccessLog.objects.create(
                user=request.user,
                action='USER_DELETED',
                description=f'Usuario {username} removido',
                ip_address=get_client_ip(request),
            )
        
        return Response({'success': True, 'message': 'Usuario removido'})
    except User.DoesNotExist:
        return Response({'success': False, 'error': 'Usuario nao encontrado'}, status=404)

@api_view(['POST'])
@permission_classes([AllowAny])
def api_change_password(request, user_id):
    """Altera senha do usuario"""
    password = request.data.get('password', '')
    
    if not password:
        return Response({'success': False, 'error': 'Senha e obrigatoria'}, status=400)
    
    try:
        user = User.objects.get(id=user_id)
        user.set_password(password)
        user.save()
        return Response({'success': True, 'message': 'Senha alterada'})
    except User.DoesNotExist:
        return Response({'success': False, 'error': 'Usuario nao encontrado'}, status=404)
