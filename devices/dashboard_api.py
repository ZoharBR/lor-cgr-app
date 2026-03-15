from django.http import JsonResponse
import json
from .dashboard_models import DashboardLayout, DashboardWidget, UserWidgetConfig
from .models import Device, DeviceInterface

def get_dashboard_config(request):
    """Retorna configuracao do dashboard"""
    try:
        widgets = DashboardWidget.objects.filter(is_active=True)
        widgets_data = []
        for w in widgets:
            widgets_data.append({
                'id': w.widget_id,
                'type': w.widget_type,
                'title': w.title,
                'x': w.grid_x,
                'y': w.grid_y,
                'w': w.grid_w,
                'h': w.grid_h,
                'config': w.config or {},
                'visible': True,
                'dataSource': w.data_source,
                'deviceFilter': w.device_filter,
                'interfaceFilter': w.interface_filter,
                'refresh': w.refresh_seconds,
            })
        return JsonResponse({'status': 'success', 'widgets': widgets_data})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

def save_dashboard_layout(request):
    return JsonResponse({'status': 'success'})

def create_widget(request):
    return JsonResponse({'status': 'success'})

def update_widget(request):
    return JsonResponse({'status': 'success'})

def delete_widget(request):
    return JsonResponse({'status': 'success'})

def get_widget_data(request):
    widget_type = request.GET.get('type', '')
    data = {}
    if widget_type == 'pie_chart':
        total = Device.objects.count()
        online = Device.objects.filter(is_online=True).count()
        data = {'data': [{'name': 'Online', 'value': online, 'color': '#10B981'}, {'name': 'Offline', 'value': total - online, 'color': '#EF4444'}]}
    elif widget_type == 'ddm_summary':
        ifaces = DeviceInterface.objects.filter(has_transceiver=True)
        c = ifaces.count()
        data = {'total': c, 'avgTemp': sum(i.temperature or 0 for i in ifaces)/c if c else 0, 'avgRx': sum(i.rx_power or 0 for i in ifaces)/c if c else 0, 'avgTx': sum(i.tx_power or 0 for i in ifaces)/c if c else 0}
    elif widget_type == 'big_number':
        data = {'value': Device.objects.count(), 'label': 'Dispositivos'}
    return JsonResponse({'status': 'success', 'data': data})

def get_available_devices(request):
    devices = list(Device.objects.all().values('id', 'name', 'ip', 'device_type', 'is_online'))
    return JsonResponse({'status': 'success', 'devices': devices})

def get_available_interfaces(request):
    device_id = request.GET.get('device')
    if device_id:
        ifaces = list(DeviceInterface.objects.filter(device_id=device_id).values('id', 'name'))
    else:
        ifaces = list(DeviceInterface.objects.filter(has_transceiver=True).values('id', 'name')[:50])
    return JsonResponse({'status': 'success', 'interfaces': ifaces})

def reset_dashboard(request):
    return JsonResponse({'status': 'success'})
