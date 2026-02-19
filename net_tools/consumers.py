import json
import paramiko
import threading
import time
from channels.generic.websocket import WebsocketConsumer
from django.core.files.base import ContentFile
from django.utils import timezone
from devices.models import Device, TerminalLog

class SSHConsumer(WebsocketConsumer):
    def connect(self):
        self.device_id = self.scope['url_route']['kwargs']['device_id']
        self.user = self.scope["user"]
        self.accept()
        
        # Buffer para gravar o log da sessão
        self.log_buffer = []
        self.ssh_client = None
        self.shell = None
        
        try:
            device = Device.objects.get(id=self.device_id)
            self.device_name = device.name
            
            # Cria registro de log no banco (Início da sessão)
            self.db_log = TerminalLog.objects.create(
                device=device,
                user=self.user.username if self.user.is_authenticated else "Anonymous"
            )

            # Inicia conexão SSH
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            port = device.ssh_port if device.ssh_port else 22
            
            self.ssh_client.connect(
                hostname=device.ip,
                port=int(port),
                username=device.user,
                password=device.password,
                timeout=10,
                banner_timeout=10,
                auth_timeout=10
            )
            
            # Abre terminal interativo
            self.shell = self.ssh_client.invoke_shell(term='xterm', width=80, height=24)
            self.shell.setblocking(0)
            
            # Inicia thread para ler o retorno do SSH
            self.t = threading.Thread(target=self.read_from_ssh)
            self.t.daemon = True
            self.t.start()
            
            self.send(text_data=json.dumps({'message': f'\r\n--- Conectado a {device.name} ({device.ip}) ---\r\n'}))

        except Exception as e:
            self.send(text_data=json.dumps({'message': f'\r\nErro de Conexão: {str(e)}\r\n'}))
            self.close()

    def disconnect(self, close_code):
        # Ao desconectar, salva o log em arquivo
        if hasattr(self, 'db_log'):
            self.db_log.end_time = timezone.now()
            
            # Junta tudo que foi gravado
            full_log = "".join(self.log_buffer)
            
            # Gera nome do arquivo: session_NOME_DATA.txt
            filename = f"session_{self.device_name}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.txt"
            
            # Salva no campo FileField
            self.db_log.logfile.save(filename, ContentFile(full_log))
            self.db_log.save()

        if self.ssh_client:
            self.ssh_client.close()

    def receive(self, text_data):
        # Recebe comandos do navegador e envia para o roteador
        try:
            data = json.loads(text_data)
            if 'data' in data and self.shell:
                self.shell.send(data['data'])
            
            if 'resize' in data and self.shell:
                cols = data['resize'].get('cols', 80)
                rows = data['resize'].get('rows', 24)
                self.shell.resize_pty(width=cols, height=rows)
        except:
            pass

    def read_from_ssh(self):
        # Loop infinito lendo o que o roteador responde
        while True:
            try:
                if self.shell and self.shell.recv_ready():
                    # Lê dados brutos
                    data = self.shell.recv(1024).decode('utf-8', errors='ignore')
                    
                    # Grava no buffer de log
                    self.log_buffer.append(data)
                    
                    # Envia para o navegador
                    self.send(text_data=json.dumps({'message': data}))
                else:
                    time.sleep(0.01)
                    # Se a conexão cair, para o loop
                    if not self.shell or not self.shell.active:
                        break
            except Exception:
                break
