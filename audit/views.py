from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.paginator import Paginator
from .models import AuditLog, TerminalSession

@api_view(['GET'])
def get_audit_logs(request):
    logs = AuditLog.objects.all()
    action = request.GET.get('action')
    if action and action != 'all':
        logs = logs.filter(action=action)
    device = request.GET.get('device')
    if device and device != 'all':
        logs = logs.filter(device=device)
    search = request.GET.get('search')
    if search:
        logs = logs.filter(details__icontains=search)
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 50))
    paginator = Paginator(logs, per_page)
    page_obj = paginator.get_page(page)
    data = [{'id': str(log.id), 'user': log.user, 'action': log.action, 'device': log.device, 'details': log.details, 'ip_address': log.ip_address, 'timestamp': log.timestamp.isoformat()} for log in page_obj]
    return Response({'logs': data, 'total': paginator.count})

@api_view(['GET'])
def get_log_detail(request, log_id):
    try:
        log = AuditLog.objects.get(id=log_id)
        return Response({'id': str(log.id), 'user': log.user, 'action': log.action, 'device': log.device, 'details': log.details, 'ip_address': log.ip_address, 'timestamp': log.timestamp.isoformat()})
    except AuditLog.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

@api_view(['DELETE'])
def delete_log(request, log_id):
    try:
        log = AuditLog.objects.get(id=log_id)
        log.delete()
        return Response({'success': True})
    except AuditLog.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

@api_view(['GET'])
def get_terminal_sessions(request):
    sessions = TerminalSession.objects.all()[:100]
    data = [{'id': str(s.id), 'device_name': s.device.name if s.device else 'Unknown', 'device_id': s.device_id, 'user': s.user, 'start_time': s.start_time.isoformat(), 'end_time': s.end_time.isoformat() if s.end_time else None, 'ip_address': s.ip_address} for s in sessions]
    return Response({'sessions': data})

@api_view(['GET'])
def get_session_log(request, session_id):
    try:
        s = TerminalSession.objects.get(id=session_id)
        return Response({'id': str(s.id), 'device_name': s.device.name if s.device else 'Unknown', 'user': s.user, 'log_content': s.log_content})
    except TerminalSession.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
