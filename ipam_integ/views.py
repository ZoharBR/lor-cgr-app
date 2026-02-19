from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .utils import PhpipamClient

@login_required
def ipam_dashboard(request):
    client = PhpipamClient()
    
    # Verifica conexão
    status, msg = client.check_connection()
    
    subnets = []
    if status:
        # Busca subnets (limitando a 50 para não pesar no início)
        raw_subnets = client.get_subnets()
        
        # Vamos processar para pegar o uso de cada uma (Isso pode ser lento se tiver muitas, 
        # futuramente faremos via AJAX/Celery, mas para teste serve)
        for sub in raw_subnets[:10]: # Pegando apenas as 10 primeiras para teste rápido
            usage = client.get_subnet_usage(sub['id'])
            sub['usage_percent'] = usage.get('used_percent', 0)
            subnets.append(sub)
    
    context = {
        'connection_status': status,
        'connection_msg': msg,
        'subnets': subnets
    }
    
    return render(request, 'ipam_dashboard.html', context)
