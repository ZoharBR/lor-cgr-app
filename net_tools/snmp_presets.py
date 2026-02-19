# Mapeamento de OIDs para Equipamentos Especificos (Mikrotik, Huawei, Juniper, OLTs, Servidores)

SNMP_PRESETS = {
    'mikrotik': {
        'cpu': '.1.3.6.1.2.1.25.3.3.1.2.1', # Host-Resources-MIB (Padrao Moderno)
        'memory_total': '.1.3.6.1.2.1.25.2.3.1.5.1',
        'memory_used': '.1.3.6.1.2.1.25.2.3.1.6.1',
        'uptime': '.1.3.6.1.2.1.1.3.0',
        'model_oid': '.1.3.6.1.2.1.1.1.0', # SysDescr
        'identity': '.1.3.6.1.2.1.1.5.0',
    },
    'huawei': {
        'cpu': '.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5.1', # Huawei CPU Usage
        'memory_total': '.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.6.1', 
        'memory_used': '.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.7.1',
        'uptime': '.1.3.6.1.2.1.1.3.0',
    },
    'juniper': {
        'cpu': '.1.3.6.1.4.1.2636.3.1.13.1.8.9.1.0.0', # Routing Engine CPU
        'uptime': '.1.3.6.1.2.1.1.3.0',
    },
    'fiberhome_olt': {
        'cpu': '.1.3.6.1.4.1.5875.800.3.9.1.3.0', # Exemplo generico Fiberhome
        'uptime': '.1.3.6.1.2.1.1.3.0',
    },
    'server_linux_windows_esxi': {
        # Padrao Host-Resources-MIB (Funciona em Windows, Linux e ESXi com SNMP ativo)
        'cpu': '.1.3.6.1.2.1.25.3.3.1.2.1', # Load do primeiro Core
        'uptime': '.1.3.6.1.2.1.25.1.1.0', # hrSystemUptime
        'memory_size': '.1.3.6.1.2.1.25.2.2.0',
    }
}

def get_oid(brand, key):
    # Logica inteligente: Se for Server, usa o profile generico
    if brand in ['linux', 'windows', 'server']:
        brand = 'server_linux_windows_esxi'
    
    # Se nao achar a marca, tenta Mikrotik como padrao ou Generic
    if brand not in SNMP_PRESETS:
        brand = 'mikrotik'
        
    return SNMP_PRESETS[brand].get(key, '.1.3.6.1.2.1.1.1.0')
