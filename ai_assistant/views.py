"""
LOR CGR - AI Chat API
"""
import json
import logging
import time
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db.models import Count

from .tools import get_system_config, get_tools_for_ai, execute_tool, AVAILABLE_TOOLS
from core_system.models import ChatSession, ChatMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Voce e o LOR-Assistente, especialista em gerenciamento de redes integrado ao LOR CGR.

Voce tem acesso a:
1. Banco de Dados LOR CGR - Dispositivos, status, configuracoes SSH
2. LibreNMS - Monitoramento, alertas, estatisticas
3. phpIPAM - Sub-redes, IPs disponiveis, VLANs
4. SSH - Execucao de comandos em equipamentos

Responda sempre em portugues do Brasil.
Use as ferramentas para obter dados reais.
Seja tecnico e preciso."""


def call_groq_api(messages: list, tools: list, config) -> dict:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {config.groq_api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": config.groq_model or "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096
    }
    
    # Adicionar tools apenas se existirem
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
    
    logger.info(f"Calling Groq API with model: {payload['model']}")
    
    response = requests.post(url, headers=headers, json=payload, timeout=120)
    
    if response.status_code != 200:
        error_detail = response.text
        logger.error(f"Groq API error: {response.status_code} - {error_detail}")
        raise Exception(f"Groq error: {response.status_code} - {error_detail}")
    
    return response.json()


@csrf_exempt
@require_http_methods(["POST"])
def api_chat(request):
    try:
        data = json.loads(request.body)
        user_message = data.get("message", "")
        session_id = data.get("session_id")
        
        if not user_message:
            return JsonResponse({"error": "Mensagem obrigatoria"}, status=400)
        
        config = get_system_config()
        
        if not config.groq_api_key:
            return JsonResponse({"error": "Groq API Key nao configurada"}, status=500)
        
        session = None
        if session_id:
            session = ChatSession.objects.filter(id=session_id).first()
        if not session:
            session = ChatSession.objects.create(title=user_message[:50])
        
        ChatMessage.objects.create(session=session, role="user", content=user_message)
        
        messages = [{"role": "system", "content": config.ai_system_prompt or SYSTEM_PROMPT}]
        for msg in ChatMessage.objects.filter(session=session).order_by("created_at"):
            if msg.role in ["user", "assistant"]:
                messages.append({"role": msg.role, "content": msg.content})
        
        tools = get_tools_for_ai()
        start_time = time.time()
        
        try:
            response = call_groq_api(messages, tools, config)
        except Exception as e:
            # Tentar sem tools se falhar
            logger.warning(f"Retrying without tools: {e}")
            response = call_groq_api(messages, [], config)
        
        assistant_message = response.get("choices", [{}])[0].get("message", {})
        tool_calls = assistant_message.get("tool_calls", [])
        tools_executed = 0
        
        while tool_calls:
            messages.append({
                "role": "assistant",
                "content": assistant_message.get("content", ""),
                "tool_calls": tool_calls
            })
            
            for tool_call in tool_calls:
                tool_name = tool_call["function"]["name"]
                tool_args = json.loads(tool_call["function"]["arguments"])
                tool_id = tool_call["id"]
                
                logger.info(f"Executing tool: {tool_name}")
                result = execute_tool(tool_name, tool_args, config)
                tools_executed += 1
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_id,
                    "name": tool_name,
                    "content": json.dumps(result, ensure_ascii=False)
                })
            
            response = call_groq_api(messages, tools, config)
            assistant_message = response.get("choices", [{}])[0].get("message", {})
            tool_calls = assistant_message.get("tool_calls", [])
        
        final_content = assistant_message.get("content", "Erro ao processar")
        ChatMessage.objects.create(session=session, role="assistant", content=final_content)
        
        return JsonResponse({
            "success": True,
            "message": final_content,
            "session_id": str(session.id),
            "tools_executed": tools_executed,
            "execution_time_ms": round((time.time() - start_time) * 1000)
        })
        
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def api_chat_sessions(request):
    sessions = ChatSession.objects.annotate(
        message_count=Count("messages")
    ).order_by("-updated_at")[:20]
    
    return JsonResponse({
        "sessions": [{
            "id": str(s.id),
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "message_count": s.message_count
        } for s in sessions]
    })


@csrf_exempt
@require_http_methods(["GET"])
def api_chat_session(request, session_id):
    session = ChatSession.objects.filter(id=session_id).first()
    if not session:
        return JsonResponse({"error": "Sessao nao encontrada"}, status=404)
    
    return JsonResponse({
        "session": {
            "id": str(session.id),
            "title": session.title
        },
        "messages": [{
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat()
        } for m in session.messages.all().order_by("created_at")]
    })


@csrf_exempt
@require_http_methods(["DELETE"])
def api_chat_session_delete(request, session_id):
    session = ChatSession.objects.filter(id=session_id).first()
    if not session:
        return JsonResponse({"error": "Sessao nao encontrada"}, status=404)
    session.delete()
    return JsonResponse({"success": True})


@csrf_exempt
@require_http_methods(["GET"])
def api_tools_list(request):
    return JsonResponse({
        "tools": [{"name": k, "description": v["description"]} 
                  for k, v in AVAILABLE_TOOLS.items()]
    })
