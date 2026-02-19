from django.urls import re_path
from core_system import consumers

websocket_urlpatterns = [
    re_path(r'ws/terminal/(?P<device_id>\w+)/$', consumers.SSHConsumer.as_asgi()),
]
