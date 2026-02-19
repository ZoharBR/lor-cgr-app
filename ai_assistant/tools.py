import json
from netmiko import ConnectHandler
from pysnmp.hlapi import *
from devices.models import Device, TerminalLog
from datetime import datetime

class AITools:
    """Ferramentas que a IA pode usar para interagir com o sistema"""
    
    def get_tool_definitions(self):
        """Define as ferramentas disponíveis para o Claude"""
        return [
            {
                "name": "list_devices",
                "description": "Lista todos os equipamentos cadastrados no sistema com status online/offline",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "vendor": {
                            "type": "string",
                            "description": "Filtrar por fabricante (opcional): Huawei, Mikrotik, Cisco"
                        },
                        "online_only": {
                            "type": "boolean",
                            "description": "Mostrar apenas equipamentos online"
                        }
                    }
                }
            },
            {
                "name": "get_device_info",
                "description": "Obtém informações detalhadas de um equipamento específico pelo nome ou IP",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "identifier": {
                            "type": "string",
                            "description": "Nome ou IP do equipamento"
                        }
                    },
                    "required": ["identifier"]
                }
            },
            {
                "name": "execute_ssh_command",
                "description": "Executa um comando SSH em um equipamento. Suporta Huawei, Mikrotik e Cisco. SEMPRE use confirm=false primeiro para simular!",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "device_id": {
                            "type": "integer",
                            "description": "ID do equipamento"
                        },
                        "command": {
                            "type": "string",
                            "description": "Comando a ser executado (ex: 'display pppoe-user online', '/ppp active print')"
                        },
                        "confirm": {
                            "type": "boolean",
                            "description": "Se true, executa de verdade. Se false, apenas simula (SEMPRE comece com false!)"
                        }
                    },
                    "required": ["device_id", "command"]
                }
            },
            {
                "name": "get_pppoe_sessions",
                "description": "Obtém informações sobre sessões PPPoE ativas em um equipamento BRAS (Huawei ou Mikrotik)",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "device_id": {
                            "type": "integer",
                            "description": "ID do equipamento BRAS"
                        }
                    },
                    "required": ["device_id"]
                }
            },
            {
                "name": "get_interface_status",
                "description": "Obtém status de interfaces de um equipamento",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "device_id": {
                            "type": "integer",
                            "description": "ID do equipamento"
                        }
                    },
                    "required": ["device_id"]
                }
            }
        ]
    
    def execute_tool(self, tool_name, tool_input):
        """Executa a ferramenta solicitada pela IA"""
        
        try:
            if tool_name == "list_devices":
                return self._list_devices(tool_input)
            elif tool_name == "get_device_info":
                return self._get_device_info(tool_input)
            elif tool_name == "execute_ssh_command":
                return self._execute_ssh_command(tool_input)
            elif tool_name == "get_pppoe_sessions":
                return self._get_pppoe_sessions(tool_input)
            elif tool_name == "get_interface_status":
                return self._get_interface_status(tool_input)
            else:
                return {"error": f"Ferramenta '{tool_name}' não encontrada"}
                
        except Exception as e:
            return {"error": f"Erro ao executar {tool_name}: {str(e)}"}
    
    # ===== IMPLEMENTAÇÃO DAS FERRAMENTAS =====
    
    def _list_devices(self, params):
        """Lista equipamentos"""
        vendor = params.get('vendor')
        online_only = params.get('online_only', False)
        
        query = Device.objects.all()
        
        if vendor:
            query = query.filter(vendor__icontains=vendor)
        if online_only:
            query = query.filter(is_online=True)
        
        devices = []
        for d in query:
            devices.append({
                "id": d.id,
                "name": d.name,
                "ip": d.ip,
                "vendor": d.vendor,
                "model": d.model,
                "is_online": d.is_online,
                "is_bras": d.is_bras,
                "protocol": d.protocol,
                "port": d.port
            })
        
        return {
            "total": len(devices),
            "devices": devices
        }
    
    def _get_device_info(self, params):
        """Obtém informações de um equipamento"""
        identifier = params.get('identifier')
        
        try:
            device = Device.objects.filter(name__icontains=identifier).first() or \
                     Device.objects.filter(ip=identifier).first()
            
            if not device:
                return {"error": f"Equipamento '{identifier}' não encontrado"}
            
            return {
                "id": device.id,
                "name": device.name,
                "ip": device.ip,
                "vendor": device.vendor,
                "model": device.model,
                "os_version": device.os_version,
                "serial_number": device.serial_number,
                "is_online": device.is_online,
                "protocol": device.protocol,
                "port": device.port,
                "is_bras": device.is_bras,
                "username": device.username,
                "librenms_id": device.librenms_id
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _execute_ssh_command(self, params):
        """Executa comando SSH"""
        device_id = params.get('device_id')
        command = params.get('command')
        confirm = params.get('confirm', False)
        
        if not confirm:
            return {
                "simulated": True,
                "message": "⚠️ Comando NÃO executado (confirm=false)",
                "command": command,
                "device_id": device_id,
                "warning": "Para executar de verdade, use confirm=true"
            }
        
        try:
            device = Device.objects.get(id=device_id)
            
            # Mapear vendor para device_type do Netmiko
            vendor_map = {
                'Huawei': 'huawei',
                'Mikrotik': 'mikrotik_routeros',
                'Cisco': 'cisco_ios',
                'Juniper': 'juniper_junos',
            }
            
            device_type = vendor_map.get(device.vendor, 'generic_termserver')
            
            device_params = {
                'device_type': device_type,
                'host': device.ip,
                'username': device.username,
                'password': device.password,
                'port': device.port,
                'timeout': 30,
                'session_timeout': 30,
            }
            
            connection = ConnectHandler(**device_params)
            
            # Comandos específicos por vendor
            if device.vendor == 'Huawei':
                connection.send_command("screen-length 0 temporary")
            
            output = connection.send_command(command, read_timeout=30)
            connection.disconnect()
            
            # Salvar log
            TerminalLog.objects.create(
                device=device,
                command=command,
                output=output
            )
            
            return {
                "success": True,
                "device": device.name,
                "command": command,
                "output": output
            }
            
        except Exception as e:
            return {"error": f"Erro ao executar comando: {str(e)}"}
    
    def _get_pppoe_sessions(self, params):
        """Obtém sessões PPPoE"""
        device_id = params.get('device_id')
        
        try:
            device = Device.objects.get(id=device_id)
            
            # Comando baseado no vendor
            if device.vendor == 'Huawei':
                command = "display access-user"
            elif device.vendor == 'Mikrotik':
                command = "/ppp active print detail"
            else:
                return {"error": f"Vendor {device.vendor} não suportado para PPPoE"}
            
            vendor_map = {
                'Huawei': 'huawei',
                'Mikrotik': 'mikrotik_routeros',
            }
            
            device_params = {
                'device_type': vendor_map[device.vendor],
                'host': device.ip,
                'username': device.username,
                'password': device.password,
                'port': device.port,
                'timeout': 30,
            }
            
            connection = ConnectHandler(**device_params)
            
            if device.vendor == 'Huawei':
                connection.send_command("screen-length 0 temporary")
            
            output = connection.send_command(command, read_timeout=30)
            connection.disconnect()
            
            # Parsear output para contar sessões
            import re
            if device.vendor == 'Mikrotik':
                # Contar linhas com "name=" (cada linha é uma sessão)
                sessions = len(re.findall(r'name=', output))
            else:
                # Huawei - contar linhas com usuários
                sessions = len(re.findall(r'\d+\.\d+\.\d+\.\d+', output))
            
            return {
                "success": True,
                "device": device.name,
                "vendor": device.vendor,
                "total_sessions": sessions,
                "output": output
            }
            
        except Exception as e:
            return {"error": f"Erro ao obter sessões PPPoE: {str(e)}"}
    
    def _get_interface_status(self, params):
        """Obtém status de interfaces"""
        device_id = params.get('device_id')
        
        try:
            device = Device.objects.get(id=device_id)
            
            vendor_map = {
                'Huawei': 'huawei',
                'Mikrotik': 'mikrotik_routeros',
                'Cisco': 'cisco_ios',
            }
            
            device_params = {
                'device_type': vendor_map.get(device.vendor, 'generic_termserver'),
                'host': device.ip,
                'username': device.username,
                'password': device.password,
                'port': device.port,
                'timeout': 30,
            }
            
            connection = ConnectHandler(**device_params)
            
            # Comando baseado no vendor
            if device.vendor == 'Huawei':
                connection.send_command("screen-length 0 temporary")
                command = 'display interface brief'
            elif device.vendor == 'Mikrotik':
                command = '/interface print brief'
            else:
                command = 'show ip interface brief'
            
            output = connection.send_command(command, read_timeout=30)
            connection.disconnect()
            
            return {
                "success": True,
                "device": device.name,
                "interfaces": output
            }
            
        except Exception as e:
            return {"error": f"Erro ao obter interfaces: {str(e)}"}
