# Trecho de lógica para Huawei NE8000
def get_huawei_optics(ssh):
    # Comando para ver potência de todos os GBICs
    stdin, stdout, stderr = ssh.exec_command('display interface transceiver verbose')
    output = stdout.read().decode()
    
    # Regex para capturar Interface, RX e TX
    interfaces = re.findall(r'(\w+[\d/]+) transceiver information:.*?Rx Power\s+:\s+([-.\d]+).*?Tx Power\s+:\s+([-.\d]+)', output, re.DOTALL)
    
    results = {}
    for iface, rx, tx in interfaces:
        results[iface] = {'rx': rx, 'tx': tx}
    return results
