from django.urls import path
from . import views

urlpatterns = [
    path('logs/', views.get_audit_logs, name='audit-logs'),
    path('logs/<int:log_id>/', views.get_log_detail, name='audit-log-detail'),
    path('logs/<int:log_id>/delete/', views.delete_log, name='audit-log-delete'),
    path('sessions/', views.get_terminal_sessions, name='audit-sessions'),
    path('sessions/<int:session_id>/', views.get_session_log, name='audit-session-log'),
]
