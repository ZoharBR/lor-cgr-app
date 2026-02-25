#!/usr/bin/env python3
"""
Sincroniza dispositivos do LibreNMS com o LOR CGR
"""
import os
import sys
import django
import requests

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lorcgr_core.settings')
sys.path.insert(0, '/opt/lorcgr')
django.setup()

from devices.models import Device

# Configurações LibreNMS
LIBRENMS_URL = "http://45.71.242.131:8081"
LIBRENMS_TOKEN = "2aaf40939db3c98d007a6f3d0d618296"

def get_librenms_devices():
    """Busca dispositivos do LibreNMS"""
    headers = {"X-Auth-Token": LIBRENMS_TOKEN}
    try:
        response = requests.get(f"{LIBRENMS_URL}/api/v0/devices", headers=headers, timeout=10)
        data = response.json()
        if data.get('status') == 'ok':
            return data.get('devices', [])
    except Exception as e:
        print(f"Erro ao conectar LibreNMS: {e}")
    return []

def sync_devices():
    """Sincroniza dispositivos"""
    librenms_devices = get_librenms_devices()
    
    print(f"Encontrados {len(librenms_devices)} dispositivos no LibreNMS")
    
    created = 0
    updated = 0
    
    for dev in librenms_devices:
        # Mapear marca
        os_type = dev.get('os', 'unknown')
        brand_map = {
            'routeros': 'Mikrotik',
            'mikrotik': 'Mikrotik',
            'vrp': 'Huawei',
            'huawei': 'Huawei',
            'ios': 'Cisco',
            'cisco': 'Cisco',
            'linux': 'Linux',
            'ubiquiti': 'Ubiquiti',
        }
        vendor = brand_map.get(os_type, 'Outros')
        
        ip_addr = dev.get('ip', dev.get('hostname', ''))
        
        # Dados do dispositivo
        device_data = {
            'name': dev.get('sysName') or dev.get('hostname', 'Unknown'),
            'ip': ip_addr,
            'username': 'admin',
            'password': '',
            'vendor': vendor,
            'is_online': dev.get('status', 0) == 1,
            'snmp_community': dev.get('community', 'public'),
            'snmp_port': dev.get('port', 161),
            'librenms_id': dev.get('device_id'),
            'model': dev.get('hardware', ''),
            'os_version': dev.get('version', ''),
            'serial_number': dev.get('serial', ''),
        }
        
        # Criar ou atualizar usando o campo correto 'ip'
        device, created_new = Device.objects.update_or_create(
            ip=ip_addr,
            defaults=device_data
        )
        
        if created_new:
            created += 1
            print(f"  [NOVO] {device.name} ({device.ip}) - {vendor}")
        else:
            updated += 1
            print(f"  [ATUALIZADO] {device.name} ({device.ip}) - {vendor}")
    
    print(f"\nResumo: {created} novos, {updated} atualizados")
    return created, updated

if __name__ == "__main__":
    sync_devices()
