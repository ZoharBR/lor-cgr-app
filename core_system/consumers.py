import json
import paramiko
import threading
import time
from datetime import datetime
from channels.generic.websocket import WebsocketConsumer
from devices.models import Device, TerminalLog
from django.core.files.base import ContentFile

class SSHConsumer(WebsocketConsumer):
    def connect(self):
        self.accept()
        self.device_id = self.scope['url_route']['kwargs']['device_id']
        self.user = self.scope.get('user')
        
        self.ssh = None
        self.channel = None
        self.log_data = []

        try:
            device = Device.objects.get(id=self.device_id)
            
            # Auditoria
            user_name = self.user.username if self.user and self.user.is_authenticated else "Admin"
            self.log_obj = TerminalLog.objects.create(
                device_name=device.name, device_ip=device.ip, user=user_name, log_file=""
            )

            # SSH
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh.connect(
                device.ip, port=device.port, username=device.user, 
                password=device.password, timeout=10
            )
            
            # shell
            self.channel = self.ssh.invoke_shell(term='xterm', width=80, height=24)
            
            # Thread de leitura
            threading.Thread(target=self.read_from_ssh, daemon=True).start()

        except Exception as e:
            self.send(text_data=json.dumps({'message': f'\r\n\x1b[31m[ERRO] {str(e)}\x1b[0m\r\n'}))
            self.close()

    def receive(self, text_data):
        # Recebe do navegador e manda pro equipamento
        try:
            data = json.loads(text_data)
            self.channel.send(data.get('message', ''))
        except:
            self.channel.send(text_data)

    def read_from_ssh(self):
        while True:
            try:
                if self.channel.recv_ready():
                    data = self.channel.recv(4096).decode('utf-8', 'ignore')
                    # ENVIO DUPLO: Tenta JSON, se falhar manda texto puro
                    try:
                        self.send(text_data=json.dumps({'message': data}))
                    except:
                        self.send(text_data=data)
                    self.log_data.append(data)
                else:
                    time.sleep(0.02)
            except:
                break

    def disconnect(self, close_code):
        if hasattr(self, 'log_obj') and self.log_data:
            content = "".join(self.log_data)
            self.log_obj.log_file.save(f"ssh_{self.log_obj.id}.txt", ContentFile(content))
        if self.ssh: self.ssh.close()
