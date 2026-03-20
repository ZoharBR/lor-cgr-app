import json
import asyncio
import os
import pty
import select
import struct
import fcntl
import termios
import signal
import sys
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from devices.models import Device

SSHPASS_PATH = '/usr/bin/sshpass'
SSH_PATH = '/usr/bin/ssh'

class TerminalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.device_id = self.scope['url_route']['kwargs']['device_id']
        self.device = await self.get_device()
        self.pty_master = None
        self.child_pid = None
        self.running = True
        await self.accept()
        if not self.device:
            await self.send(text_data=json.dumps({'type': 'error', 'data': 'Device not found'}))
            await self.close()
            return
        asyncio.create_task(self.start_ssh())

    @database_sync_to_async
    def get_device(self):
        try:
            return Device.objects.get(id=self.device_id)
        except Device.DoesNotExist:
            return None

    async def start_ssh(self):
        try:
            ip = str(self.device.ip)
            port = self.device.ssh_port or 22
            user = self.device.ssh_user or 'root'
            password = self.device.ssh_password or ''
            await self.send(text_data=json.dumps({'type': 'connected', 'data': f'Connecting to {self.device.name}...'}))
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._fork_ssh, ip, port, user, password)
            if result:
                self.pty_master, self.child_pid = result
                asyncio.create_task(self.read_pty())
        except Exception as e:
            await self.send(text_data=json.dumps({'type': 'error', 'data': str(e)}))

    def _fork_ssh(self, ip, port, user, password):
        try:
            master, slave = pty.openpty()
            
            # Configurar terminal com suporte a backspace/delete
            mode = termios.tcgetattr(slave)
            mode[3] = mode[3] & ~termios.ECHO  # Disable echo if needed
            mode[0] = mode[0] | termios.BRKINT | termios.ICRNL
            mode[3] = mode[3] | termios.ICANON | termios.ECHO | termios.ECHOE | termios.ECHOK
            termios.tcsetattr(slave, termios.TCSANOW, mode)
            
            pid = os.fork()
            if pid == 0:
                os.setsid()
                os.dup2(slave, 0)
                os.dup2(slave, 1)
                os.dup2(slave, 2)
                os.close(slave)
                os.close(master)
                
                # Set environment for proper terminal
                os.environ['TERM'] = 'xterm-256color'
                os.environ['COLORTERM'] = 'truecolor'
                
                os.execvp(SSHPASS_PATH, [
                    'sshpass', '-p', password,
                    SSH_PATH,
                    '-o', 'StrictHostKeyChecking=no',
                    '-o', 'UserKnownHostsFile=/dev/null',
                    '-o', 'LogLevel=ERROR',
                    '-p', str(port),
                    f'{user}@{ip}'
                ])
                os._exit(1)
            else:
                os.close(slave)
                flags = fcntl.fcntl(master, fcntl.F_GETFL)
                fcntl.fcntl(master, fcntl.F_SETFL, flags | os.O_NONBLOCK)
                return (master, pid)
        except Exception as e:
            print(f"Fork error: {e}", file=sys.stderr)
            return None

    async def read_pty(self):
        loop = asyncio.get_event_loop()
        while self.running and self.pty_master:
            try:
                ready, _, _ = await loop.run_in_executor(None, lambda: select.select([self.pty_master], [], [], 0.1))
                if self.pty_master in ready:
                    data = os.read(self.pty_master, 4096)
                    if data:
                        await self.send(text_data=json.dumps({'type': 'output', 'data': data.decode('utf-8', errors='replace')}))
                    else:
                        break
            except:
                break
        await self.send(text_data=json.dumps({'type': 'disconnected', 'data': 'Connection closed'}))

    async def disconnect(self, close_code):
        self.running = False
        if self.child_pid:
            try:
                os.kill(self.child_pid, signal.SIGTERM)
            except:
                pass
        if self.pty_master:
            try:
                os.close(self.pty_master)
            except:
                pass

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('type') == 'input' and self.pty_master:
                input_data = data.get('data', '')
                # Tratar teclas especiais
                if input_data:
                    # Enviar diretamente para o PTY
                    os.write(self.pty_master, input_data.encode('utf-8'))
            elif data.get('type') == 'resize' and self.pty_master:
                winsize = struct.pack('HHHH', data.get('rows', 24), data.get('cols', 80), 0, 0)
                fcntl.ioctl(self.pty_master, termios.TIOCSWINSZ, winsize)
        except:
            pass
