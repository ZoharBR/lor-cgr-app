import re
from netmiko import ConnectHandler

def discover_device_details(device):
    data = { 'hostname': '', 'model': '', 'os_version': '', 'serial_number': '' }

    try:
        # Configuração da conexão usando os dados que você salvou no Modal
        conn = {
            'device_type': 'huawei' if 'huawei' in device.vendor.lower() else 'mikrotik_routeros',
            'host': device.ip,
            'username': device.username,
            'password': device.password,
            'port': device.port, # Usa a porta 2222 do seu print
            'timeout': 20,
            'global_delay_factor': 2
        }

        with ConnectHandler(**conn) as ssh:
            if 'huawei' in device.vendor.lower():
                ssh.send_command("screen-length 0 temporary")
                ver_out = ssh.send_command("display version")
                esn_out = ssh.send_command("display esn")
                conf_out = ssh.send_command("display current-configuration | include sysname")

                # 1. System Name (Hostname) - Ex: bras_ne8000
                h_match = re.search(r'sysname\s+(\S+)', conf_out)
                if h_match: data['hostname'] = h_match.group(1)

                # 2. Hardware (Modelo) - Ex: NetEngine 8000
                m_match = re.search(r'(NetEngine\s+\d+\s?\w*)', ver_out, re.IGNORECASE)
                if m_match: data['model'] = m_match.group(1)
                
                # 3. Operating System (Versão) - Ex: 8.231
                v_match = re.search(r'Version\s+(\d+\.\d+)', ver_out)
                if v_match: data['os_version'] = v_match.group(1)

                # 4. Serial - Ex: 2102355FTE...
                s_match = re.search(r'ESN\s*.*:\s*([a-zA-Z0-9]+)', esn_out)
                if s_match: data['serial_number'] = s_match.group(1)

    except Exception as e:
        print(f"Erro Discovery: {e}")
        return None

    return data
