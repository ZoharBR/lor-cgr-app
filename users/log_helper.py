from .models import UserAccessLog

def log_action(user, action, description, ip_address=None, user_agent=None, 
               metadata=None, ssh_command=None, ssh_output=None, 
               ssh_device=None, ssh_success=True):
    """
    Registra uma ação do usuário no log de auditoria
    
    Args:
        user: Usuário que fez a ação
        action: Código da ação (SSH_COMMAND, DEVICE_VIEW, etc)
        description: Descrição legível da ação
        ip_address: IP do usuário
        user_agent: Browser/client do usuário
        metadata: Dados extras em JSON
        ssh_command: Comando SSH executado (se aplicável)
        ssh_output: Saída do comando SSH (se aplicável)
        ssh_device: Dispositivo onde SSH foi executado
        ssh_success: Se o comando SSH foi bem sucedido
    """
    return UserAccessLog.objects.create(
        user=user,
        action=action,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata,
        ssh_command=ssh_command,
        ssh_output=ssh_output,
        ssh_device=ssh_device,
        ssh_success=ssh_success
    )

def log_ssh(user, device_ip, device_name, command, output, success=True, ip_address=None):
    """
    Log específico para comandos SSH
    """
    return log_action(
        user=user,
        action='SSH_COMMAND',
        description=f'SSH em {device_name} ({device_ip}): {command}',
        ip_address=ip_address,
        ssh_command=command,
        ssh_output=output,
        ssh_device=f'{device_name} ({device_ip})',
        ssh_success=success
    )
