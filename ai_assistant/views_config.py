from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import subprocess
from .models_config import AIProvider, SystemSettings

@csrf_exempt
@require_http_methods(["GET", "POST"])
def manage_ai_providers(request):
    """Gerenciar provedores de IA"""
    if request.method == "GET":
        providers = AIProvider.objects.all()
        data = [{
            'id': p.id,
            'name': p.name,
            'display_name': p.display_name,
            'is_active': p.is_active,
            'model_name': p.model_name,
            'packages_installed': p.packages_installed,
            'required_packages': p.required_packages,
        } for p in providers]
        return JsonResponse({'providers': data})
    
    elif request.method == "POST":
        data = json.loads(request.body)
        provider_id = data.get('provider_id')
        
        provider = AIProvider.objects.get(id=provider_id)
        provider.api_key = data.get('api_key', provider.api_key)
        provider.api_url = data.get('api_url', provider.api_url)
        provider.model_name = data.get('model_name', provider.model_name)
        provider.is_active = data.get('is_active', provider.is_active)
        provider.save()
        
        # Se ativou este provider, desativa os outros
        if provider.is_active:
            AIProvider.objects.exclude(id=provider_id).update(is_active=False)
            settings = SystemSettings.get_instance()
            settings.active_ai_provider = provider
            settings.save()
        
        return JsonResponse({'status': 'success', 'message': 'Provedor atualizado'})

@csrf_exempt
@require_http_methods(["POST"])
def install_ai_packages(request):
    """Instalar dependências de um provedor de IA"""
    data = json.loads(request.body)
    provider_id = data.get('provider_id')
    
    try:
        provider = AIProvider.objects.get(id=provider_id)
        
        # Instalar pacotes
        for package in provider.required_packages:
            subprocess.check_call([
                'pip', 'install', package
            ])
        
        provider.packages_installed = True
        provider.save()
        
        return JsonResponse({
            'status': 'success',
            'message': f'Dependências instaladas com sucesso para {provider.display_name}'
        })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def test_ai_connection(request):
    """Testar conexão com provedor de IA"""
    data = json.loads(request.body)
    provider_id = data.get('provider_id')
    
    try:
        provider = AIProvider.objects.get(id=provider_id)
        
        # Testar baseado no provider
        if provider.name == 'anthropic':
            import anthropic
            client = anthropic.Anthropic(api_key=provider.api_key)
            response = client.messages.create(
                model=provider.model_name or "claude-sonnet-4-20250514",
                max_tokens=10,
                messages=[{"role": "user", "content": "teste"}]
            )
            return JsonResponse({'status': 'success', 'message': 'Conexão OK!'})
        
        elif provider.name == 'openai':
            import openai
            client = openai.OpenAI(api_key=provider.api_key)
            response = client.chat.completions.create(
                model=provider.model_name or "gpt-4",
                messages=[{"role": "user", "content": "teste"}],
                max_tokens=10
            )
            return JsonResponse({'status': 'success', 'message': 'Conexão OK!'})
        
        # Adicionar outros providers...
        
        return JsonResponse({'status': 'error', 'message': 'Provider não implementado'})
    
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'Erro ao testar: {str(e)}'
        }, status=500)
