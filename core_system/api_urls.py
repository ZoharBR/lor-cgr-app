from django.urls import path
from . import api_views

urlpatterns = [
    path('get/', api_views.api_get_settings, name='api_get_settings'),
    path('save/', api_views.api_save_settings, name='api_save_settings'),
    path('test/librenms/', api_views.api_test_librenms, name='api_test_librenms'),
    path('test/phpipam/', api_views.api_test_phpipam, name='api_test_phpipam'),
    path('test/groq/', api_views.api_test_groq, name='api_test_groq'),
    path('git/status/', api_views.api_git_status, name='api_git_status'),
    path('git/backup/', api_views.api_git_backup, name='api_git_backup'),
    path('git/init/', api_views.api_git_init, name='api_git_init'),
    path('git/pull/', api_views.api_git_pull, name='api_git_pull'),
    path('git/restore/', api_views.api_git_restore, name='api_git_restore'),
    path('git/logs/', api_views.api_git_logs, name='api_git_logs'),
    path('git/checkout/', api_views.api_git_checkout, name='api_git_checkout'),
]
