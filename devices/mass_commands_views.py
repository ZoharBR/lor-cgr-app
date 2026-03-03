from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
from .models import Device, MassCommandScript, MassCommandExecution, MassCommandResult

def check_admin(request):
    profile = getattr(request.user, 'userprofile', None)
    return profile and profile.role == 'ADMIN'

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_scripts(request):
    scripts = MassCommandScript.objects.filter(is_active=True)
    return Response({'scripts': [{'id': s.id, 'name': s.name, 'description': s.description, 'vendor': s.vendor, 'commands': s.commands, 'variables': s.variables, 'timeout': s.timeout, 'created_by': s.created_by, 'created_at': s.created_at, 'updated_at': s.updated_at} for s in scripts]})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_script(request):
    if not check_admin(request):
        return Response({'error': 'Apenas administradores'}, status=403)
    script = MassCommandScript.objects.create(name=request.data.get('name', 'Novo Script'), description=request.data.get('description', ''), vendor=request.data.get('vendor', 'all'), commands=request.data.get('commands', ''), variables=request.data.get('variables', {}), timeout=request.data.get('timeout', 30), created_by=request.user.username)
    return Response({'success': True, 'id': script.id})

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_script(request, script_id):
    if not check_admin(request):
        return Response({'error': 'Apenas administradores'}, status=403)
    try:
        script = MassCommandScript.objects.get(id=script_id)
        script.name = request.data.get('name', script.name)
        script.description = request.data.get('description', script.description)
        script.vendor = request.data.get('vendor', script.vendor)
        script.commands = request.data.get('commands', script.commands)
        script.variables = request.data.get('variables', script.variables)
        script.timeout = request.data.get('timeout', script.timeout)
        script.save()
        return Response({'success': True})
    except MassCommandScript.DoesNotExist:
        return Response({'error': 'Script nao encontrado'}, status=404)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_script(request, script_id):
    if not check_admin(request):
        return Response({'error': 'Apenas administradores'}, status=403)
    try:
        script = MassCommandScript.objects.get(id=script_id)
        script.is_active = False
        script.save()
        return Response({'success': True})
    except MassCommandScript.DoesNotExist:
        return Response({'error': 'Script nao encontrado'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_devices(request):
    vendor = request.GET.get('vendor', '')
    online = request.GET.get('online_only', 'false') == 'true'
    search = request.GET.get('search', '')
    devices = Device.objects.all()
    if vendor and vendor != 'all':
        devices = devices.filter(vendor=vendor)
    if online:
        devices = devices.filter(is_online=True)
    if search:
        devices = devices.filter(name__icontains=search)
    data = [{'id': d.id, 'name': d.name, 'ip': d.ip, 'vendor': d.vendor, 'model': d.model or '', 'is_online': d.is_online} for d in devices]
    vendors = list(Device.objects.values_list('vendor', flat=True).distinct())
    return Response({'devices': data, 'vendors': vendors})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def execute_script(request, script_id):
    if not check_admin(request):
        return Response({'error': 'Apenas administradores'}, status=403)
    device_ids = request.data.get('device_ids', [])
    variables = request.data.get('variables', {})
    if not device_ids:
        return Response({'error': 'Selecione pelo menos um equipamento'}, status=400)
    try:
        script = MassCommandScript.objects.get(id=script_id)
    except MassCommandScript.DoesNotExist:
        return Response({'error': 'Script nao encontrado'}, status=404)
    execution = MassCommandExecution.objects.create(script=script, status='pending', triggered_by=request.user.username)
    execution.devices.set(device_ids)
    from .tasks import execute_mass_command
    execute_mass_command.delay(execution.id, variables)
    return Response({'success': True, 'execution_id': execution.id, 'message': 'Executando em ' + str(len(device_ids)) + ' equipamento(s)'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_script(request, script_id):
    if not check_admin(request):
        return Response({'error': 'Apenas administradores'}, status=403)
    device_ids = request.data.get('device_ids', [])
    scheduled_at = request.data.get('scheduled_at')
    variables = request.data.get('variables', {})
    if not device_ids or not scheduled_at:
        return Response({'error': 'Dados incompletos'}, status=400)
    try:
        script = MassCommandScript.objects.get(id=script_id)
    except MassCommandScript.DoesNotExist:
        return Response({'error': 'Script nao encontrado'}, status=404)
    scheduled_dt = parse_datetime(scheduled_at)
    if not scheduled_dt:
        return Response({'error': 'Formato invalido'}, status=400)
    execution = MassCommandExecution.objects.create(script=script, status='pending', scheduled_at=scheduled_dt, triggered_by=request.user.username)
    execution.devices.set(device_ids)
    from .tasks import execute_mass_command
    execute_mass_command.apply_async(args=[execution.id, variables], eta=scheduled_dt)
    return Response({'success': True, 'execution_id': execution.id, 'message': 'Agendado'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_executions(request):
    executions = MassCommandExecution.objects.all()[:50]
    data = []
    for e in executions:
        total = e.devices.count()
        success = e.results.filter(success=True).count()
        failed = e.results.filter(success=False).count()
        data.append({'id': e.id, 'script_name': e.script.name, 'status': e.status, 'total_devices': total, 'success_count': success, 'failed_count': failed, 'scheduled_at': e.scheduled_at, 'started_at': e.started_at, 'finished_at': e.finished_at, 'triggered_by': e.triggered_by, 'created_at': e.created_at})
    return Response({'executions': data})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def execution_detail(request, execution_id):
    try:
        execution = MassCommandExecution.objects.get(id=execution_id)
    except MassCommandExecution.DoesNotExist:
        return Response({'error': 'Nao encontrado'}, status=404)
    results = [{'id': r.id, 'device_name': r.device.name, 'device_ip': r.device.ip, 'success': r.success, 'output': r.output, 'error_message': r.error_message, 'execution_time': r.execution_time, 'executed_at': r.executed_at} for r in execution.results.all()]
    return Response({'execution': {'id': execution.id, 'script_name': execution.script.name, 'script_commands': execution.script.commands, 'status': execution.status, 'scheduled_at': execution.scheduled_at, 'started_at': execution.started_at, 'finished_at': execution.finished_at, 'triggered_by': execution.triggered_by}, 'results': results})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_execution(request, execution_id):
    if not check_admin(request):
        return Response({'error': 'Apenas administradores'}, status=403)
    try:
        execution = MassCommandExecution.objects.get(id=execution_id)
        if execution.status == 'pending':
            execution.status = 'failed'
            execution.save()
            return Response({'success': True, 'message': 'Cancelado'})
        return Response({'error': 'So pendentes podem ser cancelados'}, status=400)
    except MassCommandExecution.DoesNotExist:
        return Response({'error': 'Nao encontrado'}, status=404)
