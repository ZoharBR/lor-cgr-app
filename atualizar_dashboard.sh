#!/bin/bash
# Script para atualizar o Dashboard com gráficos DDM

echo "🚀 Atualizando Dashboard LOR CGR..."

# 1. Baixar novo Dashboard.js
curl -o /opt/lorcgr/frontend/src/components/Dashboard.js https://raw.githubusercontent.com/ZoharBR/lor-cgr-app/main/frontend/src/components/Dashboard.js 2>/dev/null || echo "Baixe manualmente o Dashboard.js"

# 2. Adicionar endpoint se não existir
if ! grep -q "api_interfaces_stats" /opt/lorcgr/devices/views.py; then
    echo "Adicionando endpoint DDM..."
cat >> /opt/lorcgr/devices/views.py << 'EOF'

@csrf_exempt
def api_interfaces_stats(request):
    try:
        from .models import DeviceInterface
        transceivers = DeviceInterface.objects.filter(has_gbic=True)
        total = transceivers.count()
        temps = [t.gbic_temperature for t in transceivers if t.gbic_temperature]
        rxs = [t.rx_power for t in transceivers if t.rx_power]
        txs = [t.tx_power for t in transceivers if t.tx_power]
        return JsonResponse({
            'status': 'success',
            'total_transceivers': total,
            'avg_temperature': sum(temps)/len(temps) if temps else 0,
            'avg_rx_power': sum(rxs)/len(rxs) if rxs else 0,
            'avg_tx_power': sum(txs)/len(txs) if txs else 0,
            'alerts': {'critical': 0, 'warning': 0, 'normal': total}
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})
EOF
fi

# 3. Adicionar rota
if ! grep -q "interfaces/stats" /opt/lorcgr/devices/urls.py; then
    sed -i "/path('device/a\\    path('interfaces/stats/', views.api_interfaces_stats, name='api_interfaces_stats')," /opt/lorcgr/devices/urls.py
fi

# 4. Build
cd /opt/lorcgr/frontend && npm run build

echo "✅ Dashboard atualizado!"
