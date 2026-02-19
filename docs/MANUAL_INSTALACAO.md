# Manual de Instalação - LOR CGR

## Requisitos do Sistema

- Sistema Operacional: Ubuntu 20.04+
- RAM: Mínimo 4GB
- CPU: 2 núcleos mínimo
- Armazenamento: 20GB+

## Instalação Rápida

1. Clonar repositório
2. Criar ambiente virtual Python
3. Instalar dependências
4. Configurar banco de dados
5. Criar superusuário
6. Build do frontend
7. Iniciar serviços

## Configuração da IA

A IA usa Groq API (gratuita e rápida).

1. Crie conta em https://console.groq.com
2. Gere uma API Key
3. Edite /opt/lorcgr/ai_assistant/ai_engine.py
4. Coloque sua chave em self.api_key
5. Reinicie o Daphne

## Troubleshooting

Se a IA não responder:
- Verifique se a API Key está correta
- Reinicie o Daphne
- Teste com curl

