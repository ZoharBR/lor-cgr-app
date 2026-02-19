from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_GET
import subprocess
import json

@require_GET
def api_dashboard_noc(request):
    """
    API para retornar dados do Huawei NE8000 formatados para o Dashboard React.
    """
    venv_python = "/opt/lorcgr/venv/bin/python3"
    script_path = "/opt/lorcgr/scripts/integracao_monitoramento.py"
    
    try:
        # Executa o script e captura a saída JSON
        result = subprocess.run(
            [venv_python, script_path],
            capture_output=True, 
            text=True, 
            timeout=15
        )
        
        if result.returncode == 0:
            return JsonResponse(json.loads(result.stdout), safe=False)
        else:
            return JsonResponse({
                "status": "error", 
                "message": "Falha na execução do script de monitoramento",
                "debug": result.stderr
            }, status=500)
            
    except Exception as e:
        return JsonResponse({
            "status": "error", 
            "message": str(e)
        }, status=500)
