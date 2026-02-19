from django.core.management.base import BaseCommand
from devices.models import Device
from netmiko import ConnectHandler

class Command(BaseCommand):
    help = 'Testa comandos de óptica no Huawei'

    def handle(self, *args, **kwargs):
        # Pega o NE8000
        d = Device.objects.get(name='bras_ne8000')
        porta = d.ssh_port if d.ssh_port else 2222
        
        print(f"Conectando em {d.name} na porta {porta}...")
        
        ssh_params = {
            'device_type': 'huawei',
            'host': d.ip,
            'username': d.user,
            'password': d.password,
            'port': int(porta),
        }
        
        try:
            with ConnectHandler(**ssh_params) as net_connect:
                net_connect.send_command('screen-length 0 temporary')
                
                # Lista de comandos para testar
                comandos = [
                    'display optical-module-info',
                    'display optical-module-info verbose',
                    'display interface optical',
                ]
                
                for cmd in comandos:
                    print(f"\n>>> TESTANDO: {cmd}")
                    output = net_connect.send_command(cmd)
                    
                    if "Error" in output or "Unrecognized" in output:
                        print("X Falhou (Comando não existe)")
                    else:
                        print("V SUCESSO! O roteador aceitou este comando.")
                        print(output[:300]) # Mostra o começo da resposta
                        break # Para no primeiro que funcionar
                        
        except Exception as e:
            print(f"Erro de conexão: {e}")
