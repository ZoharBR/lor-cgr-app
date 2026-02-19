import re
import subprocess
from netmiko import ConnectHandler

try:
    from pysnmp.hlapi import *
    SNMP_AVAILABLE = True
except ImportError:
    SNMP_AVAILABLE = False

# --- VERIFICADOR DE PING (CRÍTICO) ---
def check_ping(ip):
    """Retorna True se o equipamento responde, False se estiver Offline"""
    try:
        # Pinga 1 vez, espera max 1 segundo
        response = subprocess.run(
            ['ping', '-c', '1', '-W', '1', ip],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        return response.returncode == 0
    except:
        return False

# --- FUNÇÕES SNMP ---
def get_snmp_value(ip, community, oid):
    if not SNMP_AVAILABLE: return None
    try:
        iterator = getCmd(SnmpEngine(), CommunityData(community, mpModel=1),
                          UdpTransportTarget((ip, 161), timeout=2, retries=1),
                          ContextData(), ObjectType(ObjectIdentity(oid)))
        errorIndication, errorStatus, _, varBinds = next(iterator)
        if not errorIndication and not errorStatus:
            return varBinds[0][1]
    except: pass
    return None

def scan_device_interfaces(device_obj):
    interfaces = []
    if not SNMP_AVAILABLE: return []
    community = device_obj.snmp_community or 'public'
    oids = ['1.3.6.1.2.1.31.1.1.1.1', '1.3.6.1.2.1.2.2.1.2']
    for oid_root in oids:
        if interfaces: break
        try:
            iterator = nextCmd(SnmpEngine(), CommunityData(community, mpModel=1),
                UdpTransportTarget((device_obj.ip, 161), timeout=2, retries=1),
                ContextData(), ObjectType(ObjectIdentity(oid_root)), lexicographicMode=False)
            for error, status, _, varBinds in iterator:
                if not error and not status:
                    name = str(varBinds[0][1])
                    if name and "NULL" not in name and "InLoopBack" not in name:
                        interfaces.append(name)
        except: pass
    return sorted(list(set(interfaces)))

# --- COLETORES ---
def get_device_data(device):
    data = {}
    
    # 1. VERIFICAÇÃO DE ONLINE/OFFLINE
    is_online = check_ping(device.ip)
    data['is_online'] = is_online
    
    # SE ESTIVER OFFLINE, PARA AQUI IMEDIATAMENTE!
    if not is_online:
        return data 

    vendor = str(device.vendor).lower()
    ssh_params = {
        'device_type': 'huawei' if 'huawei' in vendor else 'mikrotik_routeros',
        'host': device.ip,
        'username': device.user,
        'password': device.password,
        'port': device.port,
        'conn_timeout': 10,
        'allow_agent': False, 'look_for_keys': False, # Huawei fix
    }

    # HUAWEI
    if 'huawei' in vendor:
        if device.collect_sensors:
            val = get_snmp_value(device.ip, device.snmp_community, '1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5.1')
            if val: data['cpu'] = f"{val}%"
            uptime = get_snmp_value(device.ip, device.snmp_community, '1.3.6.1.2.1.1.3.0')
            if uptime: data['uptime'] = str(uptime)

        if device.collect_pppoe:
            try:
                with ConnectHandler(**ssh_params) as net:
                    # PPPoE
                    res = net.send_command("display access-user summary")
                    match = re.search(r'(?:Normal|Total)\s+users\s*:\s*(\d+)', res, re.IGNORECASE)
                    if match: data['pppoe'] = int(match.group(1))
                    
                    # Versão e Modelo
                    res_ver = net.send_command("display version")
                    if "VRP" in res_ver:
                        # Pega versão
                        v_match = re.search(r'Version\s+([\d\.]+)', res_ver)
                        if v_match: data['version'] = f"VRP {v_match.group(1)}"
                        # Pega modelo (ex: NetEngine 8000)
                        m_match = re.search(r'(NetEngine\s+\w+|HUAWEI\s+\w+)', res_ver)
                        if m_match: data['model'] = m_match.group(1)
            except: pass

    # MIKROTIK
    elif 'mikrotik' in vendor:
        if device.collect_sensors:
            val = get_snmp_value(device.ip, device.snmp_community, '1.3.6.1.4.1.14988.1.1.3.10.0')
            if val: data['cpu'] = f"{val}%"
            uptime = get_snmp_value(device.ip, device.snmp_community, '1.3.6.1.2.1.1.3.0')
            if uptime: data['uptime'] = str(uptime)
            
            # Versão via SNMP
            ver = get_snmp_value(device.ip, device.snmp_community, '1.3.6.1.4.1.14988.1.1.4.4.0')
            if ver: data['version'] = str(ver)
            # Modelo via SNMP
            mod = get_snmp_value(device.ip, device.snmp_community, '1.3.6.1.4.1.14988.1.1.4.3.0')
            if mod: data['model'] = str(mod)

        if device.collect_pppoe:
            try:
                with ConnectHandler(**ssh_params) as net:
                    res = net.send_command("/ppp active print count-only")
                    if res.strip().isdigit(): data['pppoe'] = int(res)
            except: pass

    return data
