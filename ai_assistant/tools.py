"""
LOR CGR - AI Tools para Network Management
"""
import requests
import paramiko
import json
import logging
from typing import Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SystemConfig:
    librenms_enabled: bool = False
    librenms_url: str = ""
    librenms_api_token: str = ""
    phpipam_enabled: bool = False
    phpipam_url: str = ""
    phpipam_app_id: str = ""
    phpipam_app_key: str = ""
    phpipam_user: str = ""
    phpipam_password: str = ""
    ai_enabled: bool = False
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    ai_system_prompt: str = ""


def get_system_config() -> SystemConfig:
    from core_system.models import SystemSettings
    try:
        settings = SystemSettings.objects.first()
        if settings:
            return SystemConfig(
                librenms_enabled=settings.librenms_enabled,
                librenms_url=settings.librenms_url or "",
                librenms_api_token=settings.librenms_api_token or "",
                phpipam_enabled=settings.phpipam_enabled,
                phpipam_url=settings.phpipam_url or "",
                phpipam_app_id=settings.phpipam_app_id or "",
                phpipam_app_key=settings.phpipam_app_key or "",
                phpipam_user=settings.phpipam_user or "",
                phpipam_password=settings.phpipam_password or "",
                ai_enabled=settings.ai_enabled,
                groq_api_key=settings.groq_api_key or "",
                groq_model=settings.groq_model or "llama-3.3-70b-versatile",
                ai_system_prompt=settings.ai_system_prompt or "",
            )
    except Exception as e:
        logger.error(f"Error loading config: {e}")
    return SystemConfig()


def tool_list_devices(args: Dict[str, Any], config: SystemConfig) -> Dict[str, Any]:
    from devices.models import Device
    try:
        queryset = Device.objects.all()
        filter_type = args.get("filter", "all")
        if filter_type == "online":
            queryset = queryset.filter(is_online=True)
        elif filter_type == "offline":
            queryset = queryset.filter(is_online=False)
        
        devices = [{
            "id": d.id,
            "name": d.name,
            "ip": d.ip,
            "vendor": d.vendor,
            "model": d.model,
            "is_online": d.is_online,
        } for d in queryset]
        return {"success": True, "data": devices, "count": len(devices)}
    except Exception as e:
        return {"success": False, "error": str(e)}


def tool_get_device(args: Dict[str, Any], config: SystemConfig) -> Dict[str, Any]:
    from devices.models import Device
    try:
        device = None
        if args.get("device_id"):
            device = Device.objects.filter(id=args["device_id"]).first()
        elif args.get("hostname"):
            from django.db.models import Q
            device = Device.objects.filter(Q(name=args["hostname"]) | Q(ip=args["hostname"])).first()
        if not device:
            return {"success": False, "error": "Dispositivo nao encontrado"}
        return {
            "success": True,
            "data": {
                "id": device.id,
                "name": device.name,
                "ip": device.ip,
                "vendor": device.vendor,
                "model": device.model,
                "is_online": device.is_online,
                "port": device.port,
                "username": device.username,
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def tool_librenms_query(args: Dict[str, Any], config: SystemConfig) -> Dict[str, Any]:
    if not config.librenms_enabled or not config.librenms_url:
        return {"success": False, "error": "LibreNMS nao configurado"}
    try:
        endpoint = args.get("endpoint", "devices")
        device_id = args.get("device_id")
        params = args.get("params", "")
        if device_id:
            url = f"{config.librenms_url}/api/v0/devices/{device_id}/{endpoint}"
        else:
            url = f"{config.librenms_url}/api/v0/{endpoint}"
        if params:
            url += f"?{params}"
        response = requests.get(url, headers={"X-Auth-Token": config.librenms_api_token}, timeout=30)
        if response.status_code != 200:
            return {"success": False, "error": f"Erro: {response.status_code}"}
        return {"success": True, "data": response.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}


def tool_phpipam_query(args: Dict[str, Any], config: SystemConfig) -> Dict[str, Any]:
    if not config.phpipam_enabled or not config.phpipam_url:
        return {"success": False, "error": "phpIPAM nao configurado"}
    try:
        endpoint = args.get("endpoint", "subnets")
        resource_id = args.get("id")
        action = args.get("action")
        search = args.get("search")
        app_id = config.phpipam_app_id or "lorcgr"
        url = f"{config.phpipam_url}/api/{app_id}/{endpoint}"
        if resource_id:
            url += f"/{resource_id}"
        if action:
            url += f"/{action}"
        if search and endpoint == "search":
            url += f"/{search}"
        response = requests.get(url, headers={"token": config.phpipam_app_key}, timeout=30)
        if response.status_code != 200:
            return {"success": False, "error": f"Erro: {response.status_code}"}
        data = response.json()
        if data.get("code") != 200:
            return {"success": False, "error": data.get("message", "Erro na API")}
        return {"success": True, "data": data.get("data")}
    except Exception as e:
        return {"success": False, "error": str(e)}


def tool_ssh_command(args: Dict[str, Any], config: SystemConfig) -> Dict[str, Any]:
    from devices.models import Device
    import time
    try:
        device = None
        if args.get("device_id"):
            device = Device.objects.filter(id=args["device_id"]).first()
        elif args.get("hostname"):
            from django.db.models import Q
            device = Device.objects.filter(Q(name=args["hostname"]) | Q(ip=args["hostname"])).first()
        if not device:
            return {"success": False, "error": "Dispositivo nao encontrado"}
        if not device.username or not device.password:
            return {"success": False, "error": "Credenciais SSH nao configuradas"}
        command = args.get("command", "")
        start_time = time.time()
        try:
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(hostname=device.ip, port=device.port or 22, username=device.username, password=device.password, timeout=30, look_for_keys=False)
            stdin, stdout, stderr = client.exec_command(command, timeout=60)
            output = stdout.read().decode("utf-8", errors="ignore")
            error = stderr.read().decode("utf-8", errors="ignore")
            client.close()
            return {"success": True, "data": {"device": device.name, "ip": device.ip, "command": command, "output": output, "error": error if error else None, "execution_time_ms": round((time.time() - start_time) * 1000)}}
        except paramiko.AuthenticationException:
            return {"success": False, "error": "Falha na autenticacao SSH"}
        except Exception as e:
            return {"success": False, "error": f"Erro: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def tool_dashboard_stats(args: Dict[str, Any], config: SystemConfig) -> Dict[str, Any]:
    from devices.models import Device
    try:
        total = Device.objects.count()
        online = Device.objects.filter(is_online=True).count()
        offline = Device.objects.filter(is_online=False).count()
        return {"success": True, "data": {"total_devices": total, "online": online, "offline": offline, "health_score": round((online / total) * 100) if total > 0 else 0}}
    except Exception as e:
        return {"success": False, "error": str(e)}


AVAILABLE_TOOLS = {
    "list_devices": {"function": tool_list_devices, "description": "Lista dispositivos de rede. Filtros: online, offline", "parameters": {"type": "object", "properties": {"filter": {"type": "string", "enum": ["online", "offline", "all"]}, "search": {"type": "string"}}, "required": []}},
    "get_device": {"function": tool_get_device, "description": "Obtem detalhes de um dispositivo", "parameters": {"type": "object", "properties": {"device_id": {"type": "string"}, "hostname": {"type": "string"}}, "required": []}},
    "librenms_query": {"function": tool_librenms_query, "description": "Consulta LibreNMS", "parameters": {"type": "object", "properties": {"endpoint": {"type": "string"}, "device_id": {"type": "string"}, "params": {"type": "string"}}, "required": ["endpoint"]}},
    "phpipam_query": {"function": tool_phpipam_query, "description": "Consulta phpIPAM", "parameters": {"type": "object", "properties": {"endpoint": {"type": "string"}, "id": {"type": "string"}, "search": {"type": "string"}}, "required": ["endpoint"]}},
    "ssh_command": {"function": tool_ssh_command, "description": "Executa comando SSH", "parameters": {"type": "object", "properties": {"device_id": {"type": "string"}, "hostname": {"type": "string"}, "command": {"type": "string"}}, "required": ["command"]}},
    "dashboard_stats": {"function": tool_dashboard_stats, "description": "Estatisticas do dashboard", "parameters": {"type": "object", "properties": {}, "required": []}}
}


def get_tools_for_ai():
    return [{"type": "function", "function": {"name": name, "description": info["description"], "parameters": info["parameters"]}} for name, info in AVAILABLE_TOOLS.items()]


def execute_tool(tool_name: str, args: Dict[str, Any], config: SystemConfig) -> Dict[str, Any]:
    if tool_name not in AVAILABLE_TOOLS:
        return {"success": False, "error": f"Tool {tool_name} nao encontrada"}
    return AVAILABLE_TOOLS[tool_name]["function"](args, config)
