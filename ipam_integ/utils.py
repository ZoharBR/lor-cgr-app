from django.urls import path
from . import views

urlpatterns = [
    path('', views.ipam_dashboard, name='ipam_home'),
]
import requests
from django.conf import settings
from .models import PhpipamSettings

class PhpipamClient:
    def __init__(self):
        # Busca a configuração ativa no banco de dados
        config = PhpipamSettings.objects.filter(is_active=True).first()
        
        if config:
            self.base_url = config.url.rstrip('/')  # Remove barra final se tiver
            self.app_id = config.app_id
            self.token = config.api_token
            # URL Base completa: http://IP/api/lorcgr/
            self.api_root = f"{self.base_url}/{self.app_id}"
            self.headers = {'token': self.token}
        else:
            self.api_root = None

    def check_connection(self):
        """Testa se a API responde"""
        if not self.api_root:
            return False, "Nenhuma configuração do PHPIPAM encontrada no banco."
        
        try:
            # Tenta buscar as seções para testar autenticação
            response = requests.get(f"{self.api_root}/sections/", headers=self.headers, timeout=5)
            if response.status_code == 200:
                return True, "Conexão OK!"
            return False, f"Erro {response.status_code}: {response.text}"
        except Exception as e:
            return False, str(e)

    def get_subnets(self):
        """Busca todas as subnets cadastradas"""
        if not self.api_root:
            return []
        
        try:
            response = requests.get(f"{self.api_root}/subnets/", headers=self.headers, timeout=5)
            data = response.json()
            if data['success']:
                return data['data']
            return []
        except:
            return []

    def get_subnet_usage(self, subnet_id):
        """Busca estatísticas de uso de uma subnet específica"""
        try:
            response = requests.get(f"{self.api_root}/subnets/{subnet_id}/usage/", headers=self.headers, timeout=5)
            data = response.json()
            if data['success']:
                return data['data']
            return {}
        except:
            return {}
