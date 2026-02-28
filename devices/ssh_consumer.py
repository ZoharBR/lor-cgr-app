import asyncio
import json
import paramiko
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from datetime import datetime
from django.contrib.auth.models import User


class SSHConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.ssh_client = None
        self.channel = None
        self.running = False
        self.session_log = []
        self.device_id = None
        self.device_name = ''
        self.db_user = None
        self.username = 'Anonymous'
        self.command_buffer = ''
        
        # Capturar usuario do LOR CGR
        user = self.scope.get('user')
        if user and user.is_authenticated:
            self.db_user = user
            self.username = user.username
        else:
            # Tentar pegar da sessao
            session = self.scope.get('session')
            if session:
                user_id = session.get('_auth_user_id')
                if user_id:
                    try:
                        self.db_user = await self.get_user(user_id)
                        self.username = self.db_user.username
                    except:
                        pass

    @database_sync_to_async
    def get_user(self, user_id):
        return User.objects.get(id=user_id)

    async def disconnect(self, close_code):
        self.running = False
        if self.channel:
            try:
                self.channel.close()
            except:
                pass
        if self.ssh_client:
            try:
                self.ssh_client.close()
            except:
                pass
        
        # Salvar log da sessao
        if self.device_id and self.session_log:
            await self.save_session_log()

    @database_sync_to_async
    def save_session_log(self):
        try:
            from devices.models import Device, TerminalSession, DeviceHistory
            from users.models import UserAccessLog
            
            device = Device.objects.get(id=self.device_id)
            
            # Contar comandos
            commands = [l for l in self.session_log if l.get('type') == 'command']
            command_count = len(commands)
            
            # Formatar output completo
            output_text = ""
            for item in self.session_log:
                if item['type'] == 'command':
                    output_text += f"\n[COMANDO]: {item['content']}\n"
                elif item['type'] == 'output':
                    output_text += item['content']
            
            # Criar registro da sessao
            session = TerminalSession.objects.create(
                device=device,
                user=self.username,
                log_content=json.dumps(self.session_log, indent=2, ensure_ascii=False)
            )
            
            # Registrar no historico do dispositivo
            DeviceHistory.objects.create(
                device=device,
                event_type='SSH_DISCONNECT',
                description=f'Usuario {self.username} desconectou. Sessao ID: {session.id}. Comandos: {command_count}'
            )
            
            # Registrar no UserAccessLog com usuario do LOR CGR
            if self.db_user:
                UserAccessLog.objects.create(
                    user=self.db_user,
                    action='SSH_DISCONNECT',
                    description=f'Sessao SSH finalizada em {device.name}. Comandos executados: {command_count}',
                    ip_address=self.scope.get('client', [''])[0] if self.scope.get('client') else None,
                    ssh_device=f'{device.name} ({device.ip})',
                    ssh_command='\n'.join([c['content'] for c in commands]),
                    ssh_output=output_text[:50000],
                    ssh_success=True
                )
        except Exception as e:
            print(f"Erro ao salvar log: {e}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            
            if data.get('type') == 'connect':
                self.device_id = data.get('device_id')
                await self.connect_ssh(data)
            elif data.get('type') == 'input' or 'data' in data:
                char = data.get('data', '')
                if self.channel and not self.channel.closed:
                    self.channel.send(char)
                    
                    # Capturar comandos completos
                    if char in ['\r', '\n']:
                        if self.command_buffer.strip():
                            self.session_log.append({
                                'timestamp': datetime.now().isoformat(),
                                'type': 'command',
                                'content': self.command_buffer.strip()
                            })
                        self.command_buffer = ''
                    elif char == '\x7f' or char == '\x08':  # Backspace
                        self.command_buffer = self.command_buffer[:-1]
                    elif char not in ['\x1b', '\t']:  # Ignorar ESC e TAB
                        self.command_buffer += char
                        
        except Exception as e:
            await self.send(json.dumps({
                'type': 'error',
                'data': f'Erro: {str(e)}\n'
            }))

    @database_sync_to_async
    def get_device(self, device_id):
        from devices.models import Device
        return Device.objects.get(id=device_id)

    @database_sync_to_async
    def log_connection(self, device, status, message, user=None):
        from devices.models import DeviceHistory
        from users.models import UserAccessLog
        
        DeviceHistory.objects.create(
            device=device,
            event_type=status,
            description=message
        )
        
        # Log no UserAccessLog
        if user and status == 'SSH_CONNECT':
            UserAccessLog.objects.create(
                user=user,
                action='SSH_CONNECT',
                description=f'SSH conectado em {device.name} ({device.ip})',
                ip_address=None,
                ssh_device=f'{device.name} ({device.ip})',
                ssh_command='[SESSAO INICIADA]',
                ssh_output='',
                ssh_success=True
            )

    async def connect_ssh(self, data):
        try:
            # Buscar dispositivo (async)
            device = await self.get_device(self.device_id)
            self.device_name = device.name
            
            await self.send(json.dumps({
                'type': 'status',
                'data': f'\r\nConectando a {device.name} ({device.ip}:{device.port})...\r\n'
            }))
            
            # Conectar via Paramiko
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            self.ssh_client.connect(
                hostname=device.ip,
                port=device.port or 22,
                username=device.username,
                password=device.password,
                timeout=30,
                look_for_keys=False,
                allow_agent=False,
                banner_timeout=30
            )

            # Criar shell interativo
            transport = self.ssh_client.get_transport()
            transport.set_keepalive(30)
            
            self.channel = transport.open_session()
            self.channel.get_pty(term='xterm-256color', width=160, height=50)
            self.channel.invoke_shell()
            self.channel.setblocking(0)

            # Log de conexao
            await self.log_connection(device, 'SSH_CONNECT', f'Usuario {self.username} conectou via terminal SSH', self.db_user)
            
            self.session_log.append({
                'timestamp': datetime.now().isoformat(),
                'type': 'connect',
                'user': self.username,
                'device': device.name,
                'ip': device.ip
            })

            await self.send(json.dumps({
                'type': 'connected',
                'data': f'\r\n[OK] Conectado a {device.name}\r\n[Usuario LOR CGR: {self.username}]\r\n\r\n'
            }))

            # Iniciar leitura de output
            self.running = True
            asyncio.create_task(self.read_output())

        except Exception as e:
            error_msg = str(e)
            await self.send(json.dumps({
                'type': 'error',
                'data': f'\r\n[ERRO] {error_msg}\r\n'
            }))
            
            # Log de erro
            try:
                device = await self.get_device(self.device_id)
                await self.log_connection(device, 'SSH_ERROR', f'Erro: {error_msg[:200]}')
            except:
                pass

    async def read_output(self):
        """Le output do SSH continuamente"""
        while self.running and self.channel and not self.channel.closed:
            try:
                if self.channel.recv_ready():
                    output = self.channel.recv(4096).decode('utf-8', errors='ignore')
                    
                    # Log do output
                    self.session_log.append({
                        'timestamp': datetime.now().isoformat(),
                        'type': 'output',
                        'content': output
                    })
                    
                    await self.send(json.dumps({
                        'type': 'output',
                        'data': output
                    }))
                    
                await asyncio.sleep(0.02)
                
            except Exception as e:
                print(f"Erro na leitura: {e}")
                break
        
        # Sessao encerrada
        if self.running:
            await self.send(json.dumps({
                'type': 'disconnected',
                'data': '\r\n[DESCONECTADO] Conexao encerrada\r\n'
            }))
