import asyncio
import json
import paramiko
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from datetime import datetime

class SSHConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.ssh_client = None
        self.channel = None
        self.running = False
        self.session_log = []
        self.device_id = None
        self.device_name = ''

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
            
            device = Device.objects.get(id=self.device_id)
            
            # Criar registro da sessao
            session = TerminalSession.objects.create(
                device=device,
                user='admin',
                log_content=json.dumps(self.session_log, indent=2, ensure_ascii=False)
            )
            
            # Registrar no historico
            DeviceHistory.objects.create(
                device=device,
                event_type='SSH_DISCONNECT',
                description=f'Sessao SSH finalizada. ID: {session.id}. Comandos executados: {len([l for l in self.session_log if l.get("type") == "command"])}'
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
                    
                    # Log de comandos
                    if char in ['\r', '\n']:
                        self.session_log.append({
                            'timestamp': datetime.now().isoformat(),
                            'type': 'command',
                            'content': '[ENTER]'
                        })
                    elif char == '\t':
                        self.session_log.append({
                            'timestamp': datetime.now().isoformat(),
                            'type': 'key',
                            'content': '[TAB]'
                        })
                        
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
    def log_connection(self, device, status, message):
        from devices.models import DeviceHistory
        DeviceHistory.objects.create(
            device=device,
            event_type=status,
            description=message
        )

    async def connect_ssh(self, data):
        try:
            # Buscar dispositivo (async)
            device = await self.get_device(self.device_id)
            self.device_name = device.name
            
            # Determinar tipo de dispositivo
            vendor = (device.vendor or '').lower()
            
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
            await self.log_connection(device, 'SSH_CONNECT', f'Conectado via terminal SSH')
            
            self.session_log.append({
                'timestamp': datetime.now().isoformat(),
                'type': 'connect',
                'device': device.name,
                'ip': device.ip
            })

            await self.send(json.dumps({
                'type': 'connected',
                'data': f'\r\n[OK] Conectado a {device.name}\r\n\r\n'
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
        buffer = ''
        
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
