import requests
import re
from django.core.management.base import BaseCommand
from django.conf import settings
from devices.models import Device, DeviceHistory, InterfaceData
from netmiko import ConnectHandler
from django.utils import timezone

class Command(BaseCommand):
    help = 'Coletor Híbrido com Debug de API Seguro'

    def handle(self, *args, **kwargs):
        devices = Device.objects.filter(is_active=True)
        base_url = settings.LIBRENMS_URL.rstrip('/')
        
        headers = {
            'X-Auth-Token': settings.LIBRENMS_TOKEN,
            'Content-Type': 'application/json'
        }

        print(f"--- Configuração API ---")
        print(f"URL: {base_url}")
        # Mostra pedaço do token para conferência
        token_visivel = settings.LIBRENMS_TOKEN[:5] + "..." if settings.LIBRENMS_TOKEN else "NÃO CONFIGURADO"
        print(f"Token: {token_visivel}")

        for d in devices:
            print(f"\n--- Processando {d.name} ({d.ip}) ---")
            
            # 1. SSH (MANTIDO - ESTÁ FUNCIONANDO)
            cpu_val = 0
            pppoe_val = 0
            is_ssh_success = False

            try:
                porta_ssh = d.ssh_port if d.ssh_port else 22
                
                ssh_params = {
                    'device_type': 'huawei' if d.vendor == 'Huawei' else 'mikrotik_routeros',
                    'host': d.ip,
                    'username': d.user,
                    'password': d.password,
                    'port': int(porta_ssh),
                    'timeout': 30,
                    'global_delay_factor': 2
                }

                # Executa conexão rápida apenas para CPU/Clientes
                with ConnectHandler(**ssh_params) as net_connect:
                    if d.vendor == 'Huawei':
                        net_connect.send_command('screen-length 0 temporary')
                        cpu_out = net_connect.send_command('display cpu-usage')
                        if 'Usage' in cpu_out:
                            cpu_match = re.search(r'CPU Usage\s*:\s*(\d+)%', cpu_out, re.IGNORECASE)
                            if cpu_match: cpu_val = int(cpu_match.group(1))

                        pppoe_out = net_connect.send_command('display access-user summary')
                        if 'users' in pppoe_out:
                            pppoe_match = re.search(r'Total users\s*:\s*(\d+)', pppoe_out, re.IGNORECASE)
                            if pppoe_match: pppoe_val = int(pppoe_match.group(1))

                    elif d.vendor == 'MikroTik':
                        cpu_out = net_connect.send_command('/system resource print')
                        match = re.search(r'cpu-load:\s*(\d+)%', cpu_out)
                        if match: cpu_val = int(match.group(1))
                        
                        pppoe_out = net_connect.send_command('/interface pppoe-server print count-only')
                        if pppoe_out.strip().isdigit(): pppoe_val = int(pppoe_out.strip())

                is_ssh_success = True
                print(f"   -> SSH OK! CPU: {cpu_val}%, Clientes: {pppoe_val}")

            except Exception as e:
                print(f"   -> Falha SSH: {e}")

            # 2. LIBRENMS (COM TRATAMENTO DE ERRO)
            try:
                # Busca ID do device
                url_busca = f"{base_url}/devices?type=ipv4&query={d.ip}"
                resp = requests.get(url_busca, headers=headers, timeout=5)
                
                try:
                    data = resp.json()
                except:
                    print(f"   -> ERRO CRÍTICO: API não retornou JSON. Status: {resp.status_code}")
                    data = {}

                # AQUI ESTAVA O ERRO: Verificamos se existe 'status' antes de ler
                if 'status' not in data:
                    print(f"   -> ERRO API: Resposta inválida do LibreNMS: {data}")
                    # Geralmente é erro de Token: {'message': 'Unauthenticated.'}
                elif data['status'] != 'ok':
                    print(f"   -> API retornou erro: {data}")
                elif len(data['devices']) == 0:
                    print(f"   -> IP {d.ip} não encontrado no cadastro do LibreNMS.")
                else:
                    device_id = data['devices'][0]['device_id']
                    
                    # Busca Sensores Ópticos (dBm)
                    url_sensors = f"{base_url}/devices/{device_id}/sensors?sensor_class=dbm"
                    resp_sens = requests.get(url_sensors, headers=headers, timeout=10)
                    sens_data = resp_sens.json()
                    
                    if 'sensors' in sens_data:
                        InterfaceData.objects.filter(device=d).delete()
                        count = 0
                        
                        # Agrupamento simples de sensores
                        mapa_interfaces = {}
                        
                        for s in sens_data['sensors']:
                            val = s['sensor_current']
                            descr = s['sensor_descr'] # Ex: "100GE0/5/0 RX Power"
                            
                            # Limpa nome
                            nome_limpo = descr.replace('RX Power', '').replace('TX Power', '').replace('Input Power', '').replace('Output Power', '').strip()
                            
                            if nome_limpo not in mapa_interfaces:
                                mapa_interfaces[nome_limpo] = {'rx': 0, 'tx': 0}
                            
                            if 'RX' in descr or 'Input' in descr: mapa_interfaces[nome_limpo]['rx'] = val
                            if 'TX' in descr or 'Output' in descr: mapa_interfaces[nome_limpo]['tx'] = val

                        # Grava no banco
                        for nome, vals in mapa_interfaces.items():
                            # Só salva se tiver leitura real
                            if vals['rx'] != 0 or vals['tx'] != 0:
                                InterfaceData.objects.create(
                                    device=d, name=nome, rx_power=vals['rx'], tx_power=vals['tx'],
                                    status='up' if float(vals['rx']) > -40 else 'down'
                                )
                                count += 1
                                
                        print(f"   -> LibreNMS OK! {count} interfaces ópticas importadas.")
                    else:
                        print("   -> LibreNMS: Nenhum sensor óptico (dBm) retornado.")

            except Exception as e:
                print(f"   -> Falha conexão API: {e}")

            # Salva
            if is_ssh_success:
                DeviceHistory.objects.create(device=d, pppoe_count=pppoe_val, cpu_usage=cpu_val, is_online=True)
                d.last_cpu = str(cpu_val)
                d.last_pppoe_count = str(pppoe_val)
                d.is_online = True
                d.save()
