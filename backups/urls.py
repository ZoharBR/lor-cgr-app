from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_backups, name='list_backups'),
    path('download/', views.download_backup, name='download_backup'),
    path('delete/', views.delete_backup, name='delete_backup'),
]
