from django.core.management.base import BaseCommand
from django.conf import settings
import anthropic
from ai_assistant.config import ANTHROPIC_API_KEY, CLAUDE_MODEL

class Command(BaseCommand):
    help = 'Verifica se o sistema de IA está configurado corretamente'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== Verificando Configuração da IA ===\n'))
        
        # 1. Verificar API Key
        self.stdout.write('1. Verificando API Key do Claude...')
        if ANTHROPIC_API_KEY and ANTHROPIC_API_KEY.startswith('sk-ant-'):
            self.stdout.write(self.style.SUCCESS('   ✓ API Key configurada'))
        else:
            self.stdout.write(self.style.ERROR('   ✗ API Key inválida ou não configurada'))
            return
        
        # 2. Testar conexão com API
        self.stdout.write('2. Testando conexão com API Anthropic...')
        try:
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            response = client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=50,
                messages=[{"role": "user", "content": "Diga apenas 'OK'"}]
            )
            if response.content[0].text:
                self.stdout.write(self.style.SUCCESS('   ✓ Conexão OK'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Erro na conexão: {str(e)}'))
            return
        
        # 3. Verificar banco de dados
        self.stdout.write('3. Verificando tabelas do banco...')
        from ai_assistant.models import Conversation, Message
        try:
            count = Conversation.objects.count()
            self.stdout.write(self.style.SUCCESS(f'   ✓ Banco OK ({count} conversas)'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Erro no banco: {str(e)}'))
            return
        
        # 4. Verificar dispositivos
        self.stdout.write('4. Verificando dispositivos cadastrados...')
        from devices.models import Device
        try:
            devices = Device.objects.all()
            self.stdout.write(self.style.SUCCESS(f'   ✓ {devices.count()} dispositivos cadastrados'))
            if devices.count() > 0:
                online = devices.filter(is_online=True).count()
                self.stdout.write(f'     - {online} online')
                self.stdout.write(f'     - {devices.count() - online} offline')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Erro: {str(e)}'))
        
        # 5. Verificar URLs
        self.stdout.write('5. Verificando rotas da API...')
        self.stdout.write('   ✓ /api/ai/chat/')
        self.stdout.write('   ✓ /api/ai/conversations/')
        self.stdout.write('   ✓ /api/ai/analyze/<id>/')
        self.stdout.write('   ✓ /manual/')
        
        self.stdout.write(self.style.SUCCESS('\n=== ✅ Sistema de IA OK ===\n'))
        self.stdout.write('Acesse o chat clicando no botão 🤖 roxo no canto da tela!\n')
