import ipaddress
import socket
import subprocess
from pysnmp.hlapi import *
from devices.models import Device, SnmpCredential

class NetworkScanner:
    def __init__(self, cidr):
        self.cidr = cidr
        self.results = []
        # Carrega todas as credenciais cadastradas no banco
        self.credentials = list(SnmpCredential.objects.all())
        
        # Se nao tiver nenhuma cadastrada, usa a padrao
        if not self.credentials:
            self.credentials = [{'community': 'public', 'version': '2c'}]

    def run(self):
        """Executa o scan na rede informada"""
        try:
            network = ipaddress.ip_network(self.cidr, strict=False)
        except ValueError:
            return {'error': 'Faixa de IP inválida.'}

        if network.num_addresses > 512:
            return {'error': 'Faixa muito grande. Escaneie no máximo um /23 por vez.'}

        active_hosts = []
        
        # 1. FASE DE PING (Discovery)
        # Filtramos primeiro quem esta vivo para nao perder tempo testando SNMP em IP morto
        for ip in network.hosts():
            ip_str = str(ip)
            if self._ping(ip_str):
                active_hosts.append(ip_str)

        # 2. FASE DE IDENTIFICAÇÃO (SNMP Multi-Tentativa)
        for ip in active_hosts:
            device_info = self._snmp_identify_multi(ip)
            
            exists = Device.objects.filter(ip_address=ip).exists()
            
            self.results.append({
                'ip': ip,
                'name': device_info.get('name', 'Desconhecido'),
                'brand': device_info.get('brand', 'genérico'),
                'model': device_info.get('model', '-'),
                'snmp_found': device_info.get('snmp_community', ''), # Retorna qual funcionou
                'snmp_ver': device_info.get('snmp_version', ''),
                'exists': exists
            })

        return {'success': True, 'devices': self.results}

    def _ping(self, ip):
        try:
            res = subprocess.call(['ping', '-c', '1', '-W', '1', ip], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return res == 0
        except:
            return False

    def _snmp_identify_multi(self, ip):
        """Tenta todas as credenciais ate uma funcionar"""
        
        # Loop nas credenciais cadastradas
        for cred in self.credentials:
            # Trata o objeto do Django ou dicionario de fallback
            community = cred.community if hasattr(cred, 'community') else cred['community']
            version_code = cred.version if hasattr(cred, 'version') else cred['version']
            
            # Mapeia 1 -> 0 (v1), 2c -> 1 (v2c) para o PySNMP
            mp_model = 0 if version_code == '1' else 1

            info = self._try_snmp_get(ip, community, mp_model)
            
            # Se achou o nome, significa que essa credencial funcionou!
            if info:
                info['snmp_community'] = community
                info['snmp_version'] = version_code
                return info
                
        # Se tentou todas e falhou
        return {'name': 'Sem SNMP', 'brand': 'desconhecido', 'model': '-', 'snmp_community': '', 'snmp_version': ''}

    def _try_snmp_get(self, ip, community, mp_model):
        """Tenta um GET unico com uma credencial especifica"""
        try:
            iterator = getCmd(
                SnmpEngine(),
                CommunityData(community, mpModel=mp_model),
                UdpTransportTarget((ip, 161), timeout=0.8, retries=1), # Timeout curto para ser rapido
                ContextData(),
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0')), # sysDescr
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.5.0'))  # sysName
            )

            errorIndication, errorStatus, errorIndex, varBinds = next(iterator)

            if not errorIndication and not errorStatus:
                sys_descr = str(varBinds[0][1])
                sys_name = str(varBinds[1][1])
                
                brand = 'linux' # Default
                desc_lower = sys_descr.lower()
                
                # Deteccao de marca
                if 'routeros' in desc_lower or 'mikrotik' in desc_lower: brand = 'mikrotik'
                elif 'huawei' in desc_lower: brand = 'huawei'
                elif 'juniper' in desc_lower: brand = 'juniper'
                elif 'cisco' in desc_lower: brand = 'cisco'
                elif 'windows' in desc_lower: brand = 'windows'
                elif 'fiberhome' in desc_lower: brand = 'fiberhome'
                
                return {
                    'name': sys_name if sys_name else ip,
                    'model': sys_descr[:40] + "...",
                    'brand': brand
                }
        except:
            return None
        return None
