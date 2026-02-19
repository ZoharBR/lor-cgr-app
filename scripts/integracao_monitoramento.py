#!/opt/lorcgr/venv/bin/python3
import requests
import subprocess
import json
import sys

# --- CONFIGURAÇÕES ---
LIBRENMS_URL = "http://127.0.0.1:8081/api/v0"
API_TOKEN = "2aaf40939db3c98d007a6f3d0d618296"
DEVICE_ID = 2
NE_IP = "45.71.240.14"
SNMP_COMMUNITY = "Visiononline1"

# OIDs Huawei NE8000
OID_PPPOE = '1.3.6.1.4.1.2011.5.2.1.14.1.15.0'
OID_UPTIME = '1.3.6.1.2.1.1.3.0'
OID_CPU_WALK = '1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5'
OID_MEM_WALK = '1.3.6.1.4.1.2011.5.25.31.1.1.1.1.7'

HEADERS = {"Authorization": f"Bearer {API_TOKEN}", "Accept": "application/json"}

def run_snmp_get(oid):
    cmd = f"snmpget -v2c -c {SNMP_COMMUNITY} -Oqv {NE_IP} {oid}"
    try:
        return subprocess.check_output(cmd, shell=True).decode('utf-8').strip().replace('"', '')
    except: return "0"

def run_snmp_walk_avg(oid):
    cmd = f"snmpwalk -v2c -c {SNMP_COMMUNITY} -Oqv {NE_IP} {oid} | awk '{{sum+=$1}} END {{if (NR>0) print sum/NR; else print 0}}'"
    try:
        val = subprocess.check_output(cmd, shell=True).decode('utf-8').strip()
        return int(float(val))
    except: return 0

def formatar_bytes(bits):
    try:
        bps = float(bits)
        if bps >= 1_000_000_000: return f"{bps/1_000_000_000:.1f} G"
        if bps >= 1_000_000: return f"{bps/1_000_000:.1f} M"
        if bps >= 1_000: return f"{bps/1_000:.0f} K"
        return "0"
    except: return "0"

def get_portas_librenms():
    lista = []
    try:
        url = f"{LIBRENMS_URL}/ports?device_id={DEVICE_ID}&columns=ifName,ifAlias,ifInOctets_rate,ifOutOctets_rate"
        resp = requests.get(url, headers=HEADERS, timeout=4)
        if resp.status_code == 200:
            for p in resp.json().get('ports', []):
                try:
                    rx = float(p.get('ifInOctets_rate', 0)) * 8
                    tx = float(p.get('ifOutOctets_rate', 0)) * 8
                    if rx > 1000 or tx > 1000:
                        desc = p.get('ifAlias', '') or "-"
                        lista.append({
                            "interface": p.get('ifName'),
                            "descricao": desc,
                            "rx_bits": int(rx),
                            "tx_bits": int(tx),
                            "rx_fmt": formatar_bytes(rx),
                            "tx_fmt": formatar_bytes(tx)
                        })
                except: continue
    except: pass
    lista.sort(key=lambda x: x['interface'])
    return lista

def main():
    pppoe = run_snmp_get(OID_PPPOE)
    cpu = run_snmp_walk_avg(OID_CPU_WALK)
    mem = run_snmp_walk_avg(OID_MEM_WALK)
    uptime = run_snmp_get(OID_UPTIME)
    interfaces = get_portas_librenms()

    dados = {
        "status": "success",
        "resumo": {
            "clientes_pppoe": int(pppoe) if pppoe.isdigit() else 0,
            "cpu_uso": cpu,
            "memoria_uso": mem,
            "uptime_raw": uptime
        },
        "interfaces": interfaces
    }
    print(json.dumps(dados))

if __name__ == "__main__":
    main()
