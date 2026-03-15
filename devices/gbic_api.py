from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
@require_http_methods(["GET"])
def gbic_list(request):
    from devices.models import DeviceInterface
    try:
        hide_no_data = request.GET.get("hide_no_data", "true") == "true"
        interfaces = DeviceInterface.objects.filter(has_gbic=True).select_related("device")
        gbics = []
        summary = {"critical": 0, "warning": 0, "down": 0, "normal": 0}
        for i in interfaces:
            temp = i.gbic_temperature
            tx = i.tx_power
            rx = i.rx_power
            if hide_no_data and temp is None and tx is None and rx is None:
                continue
            status = "normal"
            alerts = []
            if i.if_oper_status and i.if_oper_status.lower() in ["down", "lowerlayerdown"]:
                status = "down"
                alerts.append("Interface DOWN")
            if temp is not None:
                if temp > 60:
                    status = "critical"
                    alerts.append("Temperatura CRITICA: {}C".format(temp))
                elif temp > 45:
                    if status != "critical":
                        status = "warning"
                    alerts.append("Temperatura elevada: {}C".format(temp))
            if tx is not None:
                if tx < -10:
                    if status not in ["critical"]:
                        status = "critical"
                    alerts.append("TX Power muito baixo: {:.2f}dBm".format(tx))
                elif tx < 0:
                    if status == "normal":
                        status = "warning"
                    alerts.append("TX Power atencao: {:.2f} dBm".format(tx))
            if rx is not None:
                if rx < -25:
                    if status not in ["critical"]:
                        status = "critical"
                    alerts.append("RX Power muito baixo: {:.2f}dBm".format(rx))
                elif rx < -20:
                    if status == "normal":
                        status = "warning"
                    alerts.append("RX Power atencao: {:.2f} dBm".format(rx))
            # Campos de descricao: if_alias (descricao curta) e if_descr (descricao longa)
            gbics.append({
                "id": i.id,
                "device_id": i.device_id,
                "device_name": i.device.name if i.device else "Unknown",
                "device_ip": i.device.ip if i.device else "",
                "interface": i.if_name or "",
                "if_alias": i.if_alias or "",
                "if_descr": i.if_descr or "",
                "type": i.gbic_type or "",
                "vendor": i.gbic_vendor or "",
                "serial": i.gbic_serial or "",
                "temperature": temp,
                "tx_power": tx,
                "rx_power": rx,
                "oper_status": i.if_oper_status or "unknown",
                "status": status,
                "alerts": alerts,
                "is_monitored": False,
                "alarm_config": {"temp_warning": 45.0, "temp_critical": 60.0, "rx_warning": -20.0, "rx_critical": -25.0, "tx_warning": 0.0, "tx_critical": -5.0, "enabled": True}
            })
            if status in summary:
                summary[status] += 1
        return JsonResponse({"status": "success", "total": len(gbics), "summary": summary, "gbics": gbics})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET", "POST"])
def gbic_monitor_config(request):
    try:
        from devices.gbic_models import UserMonitoredGBIC
        user = request.user if request.user.is_authenticated else None
        if request.method == "POST":
            data = json.loads(request.body)
            monitored_ids = data.get("monitored", [])
            if user:
                UserMonitoredGBIC.objects.filter(user=user).delete()
                for iface_id in monitored_ids:
                    UserMonitoredGBIC.objects.create(user=user, interface_id=iface_id)
            return JsonResponse({"status": "success", "message": "Configuracao salva"})
        monitored = list(UserMonitoredGBIC.objects.filter(user=user).values_list("interface_id", flat=True)) if user else []
        return JsonResponse({"status": "success", "monitored": monitored})
    except Exception as e:
        return JsonResponse({"status": "success", "monitored": []})

@csrf_exempt
@require_http_methods(["GET", "POST"])
def gbic_alarm_config(request, gbic_id=None):
    try:
        from devices.models import DeviceInterface
        from devices.gbic_models import GBICAlarmConfig
        if request.method == "POST":
            data = json.loads(request.body)
            iface = DeviceInterface.objects.get(id=gbic_id)
            config, _ = GBICAlarmConfig.objects.get_or_create(interface=iface)
            config.temp_warning = data.get("temp_warning", 45.0)
            config.temp_critical = data.get("temp_critical", 60.0)
            config.rx_warning = data.get("rx_warning", -20.0)
            config.rx_critical = data.get("rx_critical", -25.0)
            config.tx_warning = data.get("tx_warning", 0.0)
            config.tx_critical = data.get("tx_critical", -5.0)
            config.enabled = data.get("enabled", True)
            config.save()
            return JsonResponse({"status": "success", "message": "Alarme configurado", "config": data})
        iface = DeviceInterface.objects.get(id=gbic_id)
        config = GBICAlarmConfig.objects.filter(interface=iface).first()
        if config:
            return JsonResponse({"status": "success", "config": {
                "temp_warning": config.temp_warning,
                "temp_critical": config.temp_critical,
                "rx_warning": config.rx_warning,
                "rx_critical": config.rx_critical,
                "tx_warning": config.tx_warning,
                "tx_critical": config.tx_critical,
                "enabled": config.enabled
            }})
        return JsonResponse({"status": "success", "config": {"temp_warning": 45.0, "temp_critical": 60.0, "rx_warning": -20.0, "rx_critical": -25.0, "tx_warning": 0.0, "tx_critical": -5.0, "enabled": True}})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def gbic_devices_list(request):
    from devices.models import Device, DeviceInterface
    try:
        devices = Device.objects.filter(interfaces__has_gbic=True).distinct()
        result = []
        for d in devices:
            gbic_count = DeviceInterface.objects.filter(device=d, has_gbic=True).count()
            result.append({"id": d.id, "name": d.name, "ip": d.ip, "gbic_count": gbic_count})
        return JsonResponse({"status": "success", "devices": result})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
