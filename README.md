# LOR CGR - Sistema de Gerenciamento de Rede ISP

Sistema completo para gerenciamento de redes ISP com IA integrada, terminal SSH, backups automáticos e monitoramento.

## Funcionalidades

### Terminal SSH Integrado
- Múltiplas sessões simultâneas em abas
- Suporte a Huawei, Mikrotik, Cisco, Linux
- Autocomplete com TAB
- Configurações de fonte e cores

### IA Assistente (Groq API)
- Respostas rápidas (menos de 2 segundos)
- Especialista em redes ISP
- 100% em Português do Brasil

### Backup Automático
- Agendamento flexível
- Comparação de configurações
- Restauração simples

### Monitoramento
- Status em tempo real
- Verificação automática
- Histórico de eventos

## Requisitos

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU | 2 núcleos | 4+ núcleos |
| RAM | 4GB | 8GB+ |
| Disco | 20GB | 50GB+ |
| SO | Ubuntu 20.04 | Ubuntu 22.04 |

## Instalação Rápida

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências
apt install -y python3-pip python3-venv nginx redis-server git curl

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Clonar projeto
git clone https://github.com/ZoharBR/lor-cgr-app.git /opt/lorcgr
cd /opt/lorcgr

# Ambiente Python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Banco de dados
python manage.py migrate
python manage.py createsuperuser

# Frontend
cd frontend && npm install && npm run build
cp -r build/* /opt/lorcgr/staticfiles/

# Iniciar serviços
cd /opt/lorcgr
nohup /opt/lorcgr/venv/bin/daphne -b 127.0.0.1 -p 9000 lorcgr_core.asgi:application > /var/log/daphne.log 2>&1 &
celery -A lorcgr_core worker -l info &
celery -A lorcgr_core beat -l info &
```

## Configurar IA (Groq)

1. Acesse https://console.groq.com e crie uma API Key gratuita
2. Edite /opt/lorcgr/ai_assistant/ai_engine.py
3. Coloque sua chave em: self.api_key = "sua-chave"
4. Reinicie o Daphne

## Comandos Úteis

```bash
# Reiniciar Daphne
pkill -f daphne
cd /opt/lorcgr && nohup /opt/lorcgr/venv/bin/daphne -b 127.0.0.1 -p 9000 lorcgr_core.asgi:application > /var/log/daphne.log 2>&1 &

# Reiniciar Celery
pkill -f celery
celery -A lorcgr_core worker -l info &
celery -A lorcgr_core beat -l info &

# Testar IA
curl -X POST http://127.0.0.1:9000/api/ai/chat/ -H "Content-Type: application/json" -d '{"message": "teste"}'
```

## Documentação

- [Manual de Instalação](docs/MANUAL_INSTALACAO.md)
- [Manual do Usuário](docs/MANUAL_USUARIO.md)

## Licença

MIT License

## Autor

ZoharBR - GitHub: https://github.com/ZoharBR
