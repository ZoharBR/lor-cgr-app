import os
import django
from django.core.asgi import get_asgi_application

# 1. Configura a variável de ambiente ANTES de importar qualquer coisa do Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lorcgr_core.settings')

# 2. Inicializa o Django (Isso carrega o settings.py e os Models)
# SEM ISSO, ELE QUEBRA QUANDO TENTA ACESSAR O BANCO DE DADOS NA INICIALIZAÇÃO
django.setup()

# 3. AGORA SIM podemos importar as rotas e canais (porque o Django já está pronto)
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import devices.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            devices.routing.websocket_urlpatterns
        )
    ),
})
