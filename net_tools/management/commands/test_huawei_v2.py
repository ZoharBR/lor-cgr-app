import re
from django.core.management.base import BaseCommand
from devices.models import Device
from netmiko import ConnectHandler

class Command(BaseCommand):
    help = 'Descobre comando óptico testando interface específica'

    def handle(self, *args, **kwargs):
        d = Device.objects.get(name='bras_ne8000')
        porta = d.ssh_port if d.ssh_port else 2222
        
        print(f"Conectando em {d.name}...")
        
        try:
            with ConnectHandler(device_type='huawei', host=d.ip, username=d.user, password=d.password, port=int(porta)) as net_connect:
                net_connect.send_command('screen-length 0 temporary')
                
                # 1. Pega uma interface física que esteja UP
                print("Listando interfaces...")
                desc = net_connect.send_command('display interface description')
                
                # Procura uma interface 10GE ou GE que esteja UP
                match = re.search(r'(X?GigabitEthernet\d+/\d+/\d+)\s+.*?\s+up', desc, re.IGNORECASE)
                
                if not match:
                    print("ERRO: Não achei nenhuma interface física UP para testar.")
                    # Tenta pegar qualquer uma física
                    match = re.search(r'(X?GigabitEthernet\d+/\d+/\d+)', desc)
                
                if match:
                    iface = match.group(1)
                    print(f"\n>>> Interface escolhida para teste: {iface}")
                    
                    # 2. Testa comandos específicos nessa interface
                    comandos_teste = [
                        f'display interface {iface} transceiver verbose',
                        f'display transceiver interface {iface}',
                        f'display optical-module-info interface {iface}',
                        f'display interface {iface}', # Último caso, vê se aparece no display normal
                    ]
                    
                    for cmd in comandos_teste:
                        print(f"\nTestando: {cmd}")
                        output = net_connect.send_command(cmd)
                        
                        if "Wrong parameter" in output or "Unrecognized" in output:
                            print("X Não funcionou.")
                        else:
                            print("V COMANDO ACEITO! Resultado (primeiros 300 chars):")
                            print(output[:300])
                            
                            if "RX Power" in output or "Rx Power" in output:
                                print("!!! ACHAMOS O COMANDO CERTO !!!")
                                break
                else:
                    print("Não consegui identificar nenhuma interface GigabitEthernet.")
                    print(desc[:500])

        except Exception as e:
            print(f"Erro: {e}")
