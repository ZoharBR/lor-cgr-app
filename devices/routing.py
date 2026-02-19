from django.urls import re_path
from .ssh_consumer import SSHConsumer

websocket_urlpatterns = [
    re_path(r'ws/ssh/$', SSHConsumer.as_asgi()),
]
