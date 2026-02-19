from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import uuid
from .models import Conversation, Message, AITask
from .ai_engine import ClaudeEngine
from devices.models import Device

@csrf_exempt
@require_http_methods(["POST"])
def chat(request):
    """Endpoint principal para chat com a IA"""
    
    try:
        data = json.loads(request.body)
        user_message = data.get('message')
        session_id = data.get('session_id')
        context_type = data.get('context_type')  # device, network, general
        context_id = data.get('context_id')  # ID do device se aplicável
        
        if not user_message:
            return JsonResponse({'error': 'Mensagem não fornecida'}, status=400)
        
        # Criar ou recuperar conversação
        if not session_id:
            session_id = str(uuid.uuid4())
            conversation = Conversation.objects.create(
                session_id=session_id,
                context_type=context_type,
                context_id=context_id
            )
        else:
            conversation = Conversation.objects.get(session_id=session_id)
        
        # Salvar mensagem do usuário
        Message.objects.create(
            conversation=conversation,
            role='user',
            content=user_message
        )
        
        # Preparar histórico de mensagens
        messages = []
        for msg in conversation.messages.all():
            messages.append({
                'role': msg.role,
                'content': msg.content
            })
        
        # Preparar contexto se for um device
        context_data = None
        if context_type == 'device' and context_id:
            try:
                device = Device.objects.get(id=context_id)
                context_data = {
                    'name': device.name,
                    'ip': device.ip,
                    'vendor': device.vendor,
                    'model': device.model,
                    'os_version': device.os_version,
                    'is_online': device.is_online
                }
            except Device.DoesNotExist:
                pass
        
        # Chamar Claude
        engine = ClaudeEngine()
        response = engine.chat(messages, context_type, context_data)
        
        # Salvar resposta da IA
        ai_message = Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=response['content'],
            tokens_used=response['tokens']['output']
        )
        
        return JsonResponse({
            'session_id': session_id,
            'message': response['content'],
            'tool_calls': response.get('tool_calls', []),
            'tokens': response['tokens']
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["GET"])
def get_conversation_history(request, session_id):
    """Retorna histórico de uma conversa"""
    
    try:
        conversation = Conversation.objects.get(session_id=session_id)
        messages = []
        
        for msg in conversation.messages.all():
            messages.append({
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat()
            })
        
        return JsonResponse({
            'session_id': session_id,
            'messages': messages
        })
        
    except Conversation.DoesNotExist:
        return JsonResponse({'error': 'Conversa não encontrada'}, status=404)

@csrf_exempt
@require_http_methods(["POST"])
def analyze_device(request, device_id):
    """Analisa um equipamento específico"""
    
    try:
        device = Device.objects.get(id=device_id)
        engine = ClaudeEngine()
        
        result = engine.analyze_device(device)
        
        return JsonResponse({
            'device': device.name,
            'analysis': result['content'],
            'tokens': result['tokens']
        })
        
    except Device.DoesNotExist:
        return JsonResponse({'error': 'Equipamento não encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["GET"])
def list_conversations(request):
    """Lista todas as conversas"""
    
    conversations = Conversation.objects.all().order_by('-updated_at')[:50]
    
    data = []
    for conv in conversations:
        last_message = conv.messages.last()
        data.append({
            'session_id': conv.session_id,
            'created_at': conv.created_at.isoformat(),
            'updated_at': conv.updated_at.isoformat(),
            'context_type': conv.context_type,
            'message_count': conv.messages.count(),
            'last_message': last_message.content[:100] if last_message else None
        })
    
    return JsonResponse({'conversations': data})
