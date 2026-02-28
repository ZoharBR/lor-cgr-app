"""
WebSocket Consumer para Terminal SSH com LOG de Auditoria
"""
import json
import threading
import paramiko
import time
from datetime import datetime
from channels.generic.websocket import WebsocketConsumer
from .models import Device, TerminalSession, TerminalLog, DeviceHistory
from users.models import UserAccessLog
from django.contrib.auth.models import User


class SSHConsumer(WebsocketConsumer):
    def connect(self):
        self.device_id = self.scope['url_route']['kwargs']['device_id']
        self.accept()
        
        self.ssh = None
        self.channel = None
        self.session_log = []
        self.command_buffer = ""
        self.running = False
        self.terminal_session = None
        self.db_user = None
        
        # Capturar usuário do request - tentar várias formas
        user = self.scope.get('user')
        
        # Se não tem user no scope, tentar pegar da sessão
        if not user or not user.is_authenticated:
            session = self.scope.get('session')
            if session and session.get('_auth_user_id'):
                try:
                    self.db_user = User.objects.get(id=session.get('_auth_user_id'))
                    user = self.db_user
                except:
                    pass
        else:
            self.db_user = user
        
        self.username = user.username if hasattr(user, 'username') and user.is_authenticated else 'Anonymous'
        
        try:
            device = Device.objects.get(id=self.device_id)
            
            # Registrar início da sessão
            self.terminal_session = TerminalSession.objects.create(
                device=device,
                user=self.username
            )
            
            # Log de auditoria no DeviceHistory
            DeviceHistory.objects.create(
                device=device,
                event_type='SSH_CONNECT',
                description=f'Usuario {self.username} conectou via terminal SSH'
            )
            
            # Log no UserAccessLog com usuario relacionado
            if self.db_user and self.db_user.is_authenticated:
                UserAccessLog.objects.create(
                    user=self.db_user,
                    action='SSH_CONNECT',
                    description=f'SSH conectado em {device.name} ({device.ip})',
                    ip_address=self.scope.get('client', [''])[0],
                    ssh_device=f'{device.name} ({device.ip})',
                    ssh_command='[SESSAO INICIADA]',
                    ssh_output='',
                    ssh_success=True
                )
            
            # Conectar SSH
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            self.ssh.connect(
                device.ip,
                username=device.username,
                password=device.password,
                port=device.port,
                timeout=10,
                banner_timeout=10,
                auth_timeout=10,
                look_for_keys=False,
                allow_agent=False
            )
            
            # Configurar canal PTY
            transport = self.ssh.get_transport()
            transport.set_keepalive(30)
            
            self.channel = transport.open_session()
            self.channel.get_pty(term='xterm-256color', width=120, height=40)
            self.channel.invoke_shell()
            self.channel.settimeout(0.1)
            
            # Iniciar thread de leitura
            self.running = True
            self.thread = threading.Thread(target=self.reader, daemon=True)
            self.thread.start()
            
            # Enviar mensagem de sucesso
            welcome = f'\r\n[LORCGR Terminal] Conectado a {device.name} ({device.ip})\r\n'
            welcome += f'[Usuario: {self.username}] [Sessao ID: {self.terminal_session.id}]\r\n\r\n'
            self.send(text_data=json.dumps({'message': welcome}))
            
        except Exception as e:
            error_msg = f'\r\n[ERRO] Falha na conexao SSH: {str(e)}\r\n'
            error_msg += f'Equipamento: {device.name} ({device.ip}:{device.port})\r\n'
            
            DeviceHistory.objects.create(
                device=device,
                event_type='SSH_ERROR',
                description=f'Erro ao conectar: {str(e)[:200]}'
            )
            
            # Log erro no UserAccessLog
            if self.db_user and self.db_user.is_authenticated:
                UserAccessLog.objects.create(
                    user=self.db_user,
                    action='SSH_ERROR',
                    description=f'Falha SSH em {device.name} ({device.ip}): {str(e)[:100]}',
                    ip_address=self.scope.get('client', [''])[0],
                    ssh_device=f'{device.name} ({device.ip})',
                    ssh_command='[FALHA CONEXAO]',
                    ssh_output=str(e),
                    ssh_success=False
                )
            
            self.send(text_data=json.dumps({'message': error_msg}))
            self.close()

    def receive(self, text_data):
        try:
            data = json.loads(text_data)
            char = data.get('data', '')
            
            if self.channel and not self.channel.closed and self.running:
                self.channel.send(char)
                
                if char in ['\r', '\n']:
                    if self.command_buffer.strip():
                        device = Device.objects.get(id=self.device_id)
                        TerminalLog.objects.create(
                            device=device,
                            command=self.command_buffer.strip(),
                            output='[aguardando output]'
                        )
                        
                        self.session_log.append({
                            'timestamp': datetime.now().isoformat(),
                            'type': 'command',
                            'content': self.command_buffer.strip()
                        })
                        
                        self.command_buffer = ""
                else:
                    if char not in ['\x7f', '\x08']:
                        self.command_buffer += char
                    elif len(self.command_buffer) > 0:
                        self.command_buffer = self.command_buffer[:-1]
                        
        except Exception as e:
            print(f"[SSH Consumer] Erro ao enviar dados: {e}")

    def reader(self):
        while self.running and self.channel and not self.channel.closed:
            try:
                if self.channel.recv_ready():
                    output = self.channel.recv(4096).decode('utf-8', 'ignore')
                    self.send(text_data=json.dumps({'message': output}))
                    self.session_log.append({
                        'timestamp': datetime.now().isoformat(),
                        'type': 'output',
                        'content': output
                    })
                    
                time.sleep(0.01)
                
            except Exception as e:
                print(f"[SSH Reader] Erro: {e}")
                break

    def disconnect(self, code):
        self.running = False
        
        if self.terminal_session:
            try:
                device = Device.objects.get(id=self.device_id)
                log_content = json.dumps(self.session_log, indent=2, ensure_ascii=False)
                self.terminal_session.log_content = log_content
                self.terminal_session.save()
                
                # Contar comandos executados
                commands = [item for item in self.session_log if item.get('type') == 'command']
                command_count = len(commands)
                
                DeviceHistory.objects.create(
                    device=device,
                    event_type='SSH_DISCONNECT',
                    description=f'Sessao SSH finalizada. ID: {self.terminal_session.id}. Comandos executados: {command_count}'
                )
                
                # Salvar no UserAccessLog com output completo
                if self.db_user and self.db_user.is_authenticated:
                    # Formatar output legivel
                    output_text = ""
                    for item in self.session_log:
                        if item['type'] == 'command':
                            output_text += f"\n[COMANDO]: {item['content']}\n"
                        else:
                            output_text += item['content']
                    
                    UserAccessLog.objects.create(
                        user=self.db_user,
                        action='SSH_DISCONNECT',
                        description=f'Sessao SSH finalizada em {device.name}. Comandos: {command_count}',
                        ip_address=self.scope.get('client', [''])[0],
                        ssh_device=f'{device.name} ({device.ip})',
                        ssh_command='\n'.join([c['content'] for c in commands]),
                        ssh_output=output_text[:50000],  # Limitar tamanho
                        ssh_success=True
                    )
                
            except Exception as e:
                print(f"[Disconnect] Erro ao salvar logs: {e}")
        
        try:
            if self.channel:
                self.channel.close()
        except:
            pass
        
        try:
            if self.ssh:
                self.ssh.close()
        except:
            pass
