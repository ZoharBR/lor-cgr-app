from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import UserProfile, UserRole, UserAccessLog

def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')

@api_view(['GET'])
@permission_classes([AllowAny])
def check_auth(request):
    """Verifica se usuário está logado"""
    if request.user.is_authenticated:
        profile = getattr(request.user, 'profile', None)
        return Response({
            'authenticated': True,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'name': request.user.get_full_name() or request.user.username,
                'email': request.user.email,
                'role': profile.role if profile else 'NOC',
                'avatar': profile.avatar if profile else None,
            }
        })
    return Response({'authenticated': False})

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login do usuário"""
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    
    if not username or not password:
        return Response({'success': False, 'error': 'Usuário e senha são obrigatórios'}, status=400)
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        if not user.is_active:
            return Response({'success': False, 'error': 'Usuário inativo'}, status=403)
        
        login(request, user)
        
        # Criar profile se não existir
        profile, created = UserProfile.objects.get_or_create(user=user)
        
        # Registrar log de login
        UserAccessLog.objects.create(
            user=user,
            action='USER_LOGIN',
            description=f'Login realizado com sucesso',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        )
        
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'role': profile.role,
                'avatar': profile.avatar,
            }
        })
    
    return Response({'success': False, 'error': 'Usuário ou senha incorretos'}, status=401)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout do usuário"""
    # Registrar log de logout
    UserAccessLog.objects.create(
        user=request.user,
        action='USER_LOGOUT',
        description='Logout realizado',
        ip_address=get_client_ip(request),
    )
    
    logout(request)
    return Response({'success': True})

@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def get_csrf(request):
    """Obtém token CSRF"""
    return Response({'success': True})
