from django.urls import re_path
from terminal.consumers import SSHTerminalConsumer
websocket_urlpatterns = [
    re_path(r'ws/terminal/(?P<device_id>\d+)/$', SSHTerminalConsumer.as_asgi()),
]
