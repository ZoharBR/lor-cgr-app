import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from core_system.models import ChatSession, ChatMessage
from .tools import get_all_tools, execute_tool

logger = logging.getLogger(__name__)
GROQ_API_KEY = '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'
GROQ_MODEL = 'llama-3.3-70b-versatile'
GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

def call_groq_api(messages, tools=None):
    import requests
    headers = {'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json'}
    payload = {'model': GROQ_MODEL, 'messages': messages, 'temperature': 0.7, 'max_tokens': 4096}
    if tools:
        payload['tools'] = tools
        payload['tool_choice'] = 'auto'
    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        return {'error': 'Timeout ao conectar com a IA'}
    except requests.exceptions.RequestException as e:
        return {'error': 'Erro na API: ' + str(e)}

def format_tools_for_groq():
    tools = get_all_tools()
    result = []
    for t in tools:
        result.append({'type': 'function', 'function': {'name': t['name'], 'description': t['description'], 'parameters': t.get('parameters', {'type': 'object', 'properties': {}, 'required': []})}})
    return result

@csrf_exempt
@require_http_methods(['GET'])
def api_list_tools(request):
    tools = get_all_tools()
    return JsonResponse({'tools': tools, 'count': len(tools)})

@csrf_exempt
@require_http_methods(['GET'])
def api_list_sessions(request):
    sessions = ChatSession.objects.filter(is_active=True).order_by('-updated_at')[:20]
    data = []
    for s in sessions:
        first = ChatMessage.objects.filter(session=s, role='user').first()
        data.append({'id': str(s.id), 'title': (first.content[:50] if first else 'Nova'), 'created_at': s.created_at.isoformat(), 'updated_at': s.updated_at.isoformat(), 'message_count': s.messages.count()})
    return JsonResponse({'sessions': data, 'count': len(data)})

@csrf_exempt
@require_http_methods(['GET'])
def api_get_session(request, session_id):
    try:
        session = ChatSession.objects.get(id=session_id, is_active=True)
        msgs = ChatMessage.objects.filter(session=session).order_by('created_at')
        data = []
        for m in msgs:
            data.append({'id': str(m.id), 'role': m.role, 'content': m.content, 'timestamp': m.created_at.isoformat(), 'tools_executed': getattr(m, 'tools_executed', [])})
        return JsonResponse({'session_id': str(session.id), 'messages': data})
    except ChatSession.DoesNotExist:
        return JsonResponse({'error': 'Sessao nao encontrada'}, status=404)

@csrf_exempt
@require_http_methods(['POST'])
def api_chat(request):
    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({'error': 'JSON invalido'}, status=400)
    user_message = data.get('message', '').strip()
    session_id = data.get('session_id')
    username = request.user.username if request.user.is_authenticated else 'anonimo'
    if not user_message:
        return JsonResponse({'error': 'Mensagem vazia'}, status=400)
    if session_id:
        try:
            session = ChatSession.objects.get(id=session_id, is_active=True)
            session.updated_at = timezone.now()
            session.save()
        except:
            session = ChatSession.objects.create()
    else:
        session = ChatSession.objects.create()
    ChatMessage.objects.create(session=session, role='user', content=user_message)
    history = ChatMessage.objects.filter(session=session).order_by('created_at')
    system = 'Voce e o assistente de IA do LOR CGR. Usuario: ' + username + '. Responda em portugues do Brasil. Use as ferramentas disponiveis para ajudar.'
    messages = [{'role': 'system', 'content': system}]
    for m in list(history)[-10:]:
        messages.append({'role': m.role, 'content': m.content})
    groq_tools = format_tools_for_groq()
    tools_executed = []
    final_response = None
    for _ in range(5):
        resp = call_groq_api(messages, groq_tools)
        if 'error' in resp:
            final_response = resp['error']
            break
        choice = resp.get('choices', [{}])[0]
        msg = choice.get('message', {})
        if msg.get('tool_calls'):
            messages.append(msg)
            for tc in msg['tool_calls']:
                tool_name = tc['function']['name']
                tool_args = json.loads(tc['function']['arguments'])
                result = execute_tool(tool_name, tool_args)
                tools_executed.append({'name': tool_name, 'arguments': tool_args, 'result': result})
                messages.append({'role': 'tool', 'tool_call_id': tc['id'], 'content': json.dumps(result, ensure_ascii=False) if isinstance(result, dict) else str(result)})
        else:
            final_response = msg.get('content', 'Sem resposta')
            break
    if final_response is None:
        final_response = 'Erro ao processar'
    ChatMessage.objects.create(session=session, role='assistant', content=final_response, tools_executed=tools_executed)
    return JsonResponse({'message': final_response, 'session_id': str(session.id), 'tools_executed': tools_executed})

@csrf_exempt
@require_http_methods(['DELETE'])
def api_delete_session(request, session_id):
    try:
        session = ChatSession.objects.get(id=session_id)
        session.is_active = False
        session.save()
        return JsonResponse({'success': True})
    except:
        return JsonResponse({'error': 'Sessao nao encontrada'}, status=404)
