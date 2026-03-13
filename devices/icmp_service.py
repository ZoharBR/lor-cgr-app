#!/usr/bin/env python3
"""
Servico de verificacao ICMP para dispositivos
- Ping com 5 pacotes
- Latencia < 20ms = OK (verde)
- Latencia >= 20ms = Warning (laranja)
- Perda de pacotes ou nao responde = Offline (vermelho)
"""
import subprocess
import re
import logging
from datetime import datetime
from django.utils import timezone
from django.db import transaction

logger = logging.getLogger(__name__)


class ICMPChecker:
    """Verificador ICMP para dispositivos"""
    
    # Configuracoes
    PACKETS_COUNT = 5
    TIMEOUT_MS = 2000  # 2 segundos por pacote
    WARNING_LATENCY_MS = 20  # Latencia acima disso = warning
    
    @staticmethod
    def ping_device(ip_address, count=5, timeout=2):
        """
        Executa ping no dispositivo e retorna estatisticas
        
        Returns:
            dict: {
                'success': bool,
                'packets_sent': int,
                'packets_received': int,
                'packet_loss': float,
                'min_latency': float,
                'avg_latency': float,
                'max_latency': float,
                'error': str or None
            }
        """
        result = {
            'success': False,
            'packets_sent': count,
            'packets_received': 0,
            'packet_loss': 100.0,
            'min_latency': 0,
            'avg_latency': 0,
            'max_latency': 0,
            'error': None
        }
        
        try:
            # Executar ping
            cmd = [
                '/usr/bin/ping',
                '-c', str(count),      # Numero de pacotes
                '-W', str(timeout),    # Timeout em segundos
                '-i', '0.2',           # Intervalo entre pacotes (200ms)
                '-q',                  # Modo quiet (so estatisticas)
                str(ip_address)
            ]
            
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=count * timeout + 5
            )
            
            output = process.stdout
            
            # Parsear estatisticas de pacotes
            # Exemplo: "5 packets transmitted, 5 received, 0% packet loss"
            packet_match = re.search(
                r'(\d+)\s+packets transmitted,\s+(\d+)\s+received',
                output
            )
            
            if packet_match:
                result['packets_sent'] = int(packet_match.group(1))
                result['packets_received'] = int(packet_match.group(2))
                
                if result['packets_sent'] > 0:
                    loss = (result['packets_sent'] - result['packets_received']) / result['packets_sent'] * 100
                    result['packet_loss'] = round(loss, 1)
            
            # Parsear latencia
            # Exemplo: "rtt min/avg/max/mdev = 1.234/5.678/10.123/2.345 ms"
            latency_match = re.search(
                r'rtt\s+min/avg/max/mdev\s+=\s+([\d.]+)/([\d.]+)/([\d.]+)',
                output
            )
            
            if latency_match:
                result['min_latency'] = float(latency_match.group(1))
                result['avg_latency'] = float(latency_match.group(2))
                result['max_latency'] = float(latency_match.group(3))
                result['success'] = True
            else:
                # Tentar parse alternativo (alguns sistemas usam formato diferente)
                latency_match2 = re.search(
                    r'min/avg/max/(?:mdev|stddev)\s+=\s+([\d.]+)/([\d.]+)/([\d.]+)',
                    output
                )
                if latency_match2:
                    result['min_latency'] = float(latency_match2.group(1))
                    result['avg_latency'] = float(latency_match2.group(2))
                    result['max_latency'] = float(latency_match2.group(3))
                    result['success'] = True
            
        except subprocess.TimeoutExpired:
            result['error'] = 'Timeout ao executar ping'
            logger.warning(f"ICMP timeout para {ip_address}")
        except Exception as e:
            result['error'] = str(e)
            logger.error(f"Erro ICMP para {ip_address}: {e}")
        
        return result
    
    @classmethod
    def determine_status(cls, ping_result):
        """
        Determina o status baseado no resultado do ping
        
        Regras:
        - Se perda de pacotes > 0 ou nao responde: offline
        - Se latencia media >= 20ms: warning
        - Se latencia media < 20ms sem perda: online
        """
        if not ping_result['success']:
            return 'offline'
        
        if ping_result['packet_loss'] > 0:
            return 'offline'
        
        if ping_result['avg_latency'] >= cls.WARNING_LATENCY_MS:
            return 'warning'
        
        return 'online'
    
    @classmethod
    def check_device(cls, device):
        """
        Verifica um dispositivo via ICMP e atualiza seu status
        
        Args:
            device: Instancia do modelo Device
            
        Returns:
            dict: Resultado da verificacao
        """
        from .models import ICMPCheckHistory, Device
        
        # Executar ping
        ping_result = cls.ping_device(device.ip)
        
        # Determinar status
        status = cls.determine_status(ping_result)
        
        # Atualizar dispositivo
        device.icmp_status = status
        device.icmp_latency = ping_result['avg_latency']
        device.icmp_packet_loss = ping_result['packet_loss']
        device.last_icmp_check = timezone.now()
        device.is_online = (status == 'online' or status == 'warning')
        device.save(update_fields=[
            'icmp_status', 'icmp_latency', 'icmp_packet_loss',
            'last_icmp_check', 'is_online', 'updated_at'
        ])
        
        # Salvar historico
        ICMPCheckHistory.objects.create(
            device=device,
            packets_sent=ping_result['packets_sent'],
            packets_received=ping_result['packets_received'],
            packet_loss=ping_result['packet_loss'],
            min_latency=ping_result['min_latency'],
            avg_latency=ping_result['avg_latency'],
            max_latency=ping_result['max_latency'],
            status=status
        )
        
        # Log se mudou de status
        if ping_result['success']:
            logger.info(
                f"ICMP {device.name} ({device.ip}): {status} - "
                f"latencia={ping_result['avg_latency']:.1f}ms, "
                f"perda={ping_result['packet_loss']:.1f}%"
            )
        else:
            logger.warning(
                f"ICMP {device.name} ({device.ip}): {status} - {ping_result.get('error', 'Sem resposta')}"
            )
        
        return {
            'device_id': device.id,
            'device_name': device.name,
            'ip': device.ip,
            'status': status,
            'latency': ping_result['avg_latency'],
            'packet_loss': ping_result['packet_loss'],
            'timestamp': device.last_icmp_check.isoformat()
        }
    
    @classmethod
    def check_all_devices(cls):
        """
        Verifica todos os dispositivos cadastrados
        
        Returns:
            list: Lista com resultados de cada verificacao
        """
        from .models import Device
        
        devices = Device.objects.all()
        results = []
        
        logger.info(f"Iniciando verificacao ICMP de {devices.count()} dispositivos")
        
        for device in devices:
            try:
                result = cls.check_device(device)
                results.append(result)
            except Exception as e:
                logger.error(f"Erro ao verificar {device.name}: {e}")
                results.append({
                    'device_id': device.id,
                    'device_name': device.name,
                    'ip': device.ip,
                    'status': 'error',
                    'error': str(e)
                })
        
        # Estatisticas
        online = sum(1 for r in results if r.get('status') == 'online')
        warning = sum(1 for r in results if r.get('status') == 'warning')
        offline = sum(1 for r in results if r.get('status') == 'offline')
        
        logger.info(
            f"Verificacao ICMP concluida: "
            f"{online} online, {warning} warning, {offline} offline"
        )
        
        return results


def run_icmp_check():
    """Funcao para ser chamada pelo Celery"""
    return ICMPChecker.check_all_devices()
