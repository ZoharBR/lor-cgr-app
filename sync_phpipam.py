#!/usr/bin/env python3
"""
Sincroniza sub-redes do phpIPAM com o LOR CGR
"""
import os
import sys
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lorcgr_core.settings')
sys.path.insert(0, '/opt/lorcgr')
django.setup()

PHPIPAM_URL = "http://45.71.242.131:9100"
PHPIPAM_APP_ID = "lorcgr"
PHPIPAM_APP_KEY = "5EGDT2878zL0qvJy_zRVzvy7wjh0zqHd"
PHPIPAM_USER = "lorcgr"
PHPIPAM_PASS = "lorcgr78"

def get_token():
    """Obtém token de autenticação do phpIPAM"""
    try:
        response = requests.post(
            f"{PHPIPAM_URL}/api/{PHPIPAM_APP_ID}/user/",
            headers={
                "phpipam-appkey": PHPIPAM_APP_KEY,
                "Content-Type": "application/json"
            },
            auth=(PHPIPAM_USER, PHPIPAM_PASS),
            timeout=10
        )
        data = response.json()
        print(f"Resposta phpIPAM: {data}")
        if data.get('code') == 200:
            return data.get('data', {}).get('token')
    except Exception as e:
        print(f"Erro ao autenticar phpIPAM: {e}")
    return None

def get_subnets(token):
    """Busca sub-redes do phpIPAM"""
    try:
        response = requests.get(
            f"{PHPIPAM_URL}/api/{PHPIPAM_APP_ID}/subnets/",
            headers={
                "phpipam-appkey": PHPIPAM_APP_KEY,
                "token": token,
                "Content-Type": "application/json"
            },
            timeout=10
        )
        data = response.json()
        if data.get('code') == 200:
            return data.get('data', [])
    except Exception as e:
        print(f"Erro ao buscar sub-redes: {e}")
    return []

def sync_phpipam():
    print("Conectando ao phpIPAM...")
    token = get_token()
    
    if not token:
        print("ERRO: Não foi possível obter token do phpIPAM")
        return
    
    print(f"Token obtido: {token[:20]}...")
    
    subnets = get_subnets(token)
    print(f"Encontradas {len(subnets)} sub-redes no phpIPAM")
    
    for sub in subnets[:30]:
        subnet = sub.get('subnet', '')
        mask = sub.get('mask', '')
        description = sub.get('description', '')
        print(f"  - {subnet}/{mask} - {description}")

if __name__ == "__main__":
    sync_phpipam()
