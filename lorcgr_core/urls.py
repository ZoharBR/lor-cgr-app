from django.conf.urls import include
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('api/backups/', include('backups.urls')),
    path('api/', include('users.urls')),
    path('admin/', admin.site.urls),
    path('api/audit/', include('audit.urls')),
    path('api/devices/', include('devices.urls')),
]
