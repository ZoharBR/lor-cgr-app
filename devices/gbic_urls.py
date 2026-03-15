from django.urls import path
from .gbic_api import (
    gbic_list, gbic_monitor_config, gbic_alarm_config, gbic_devices_list
)

urlpatterns = [
    path('list/', gbic_list, name='gbic_list'),
    path('devices/', gbic_devices_list, name='gbic_devices'),
    path('monitor/', gbic_monitor_config, name='gbic_monitor_config'),
    path('<int:gbic_id>/alarm/', gbic_alarm_config, name='gbic_alarm_config'),
]
