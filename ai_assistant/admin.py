from django.contrib import admin
from .models import Conversation, Message, AITask, DeviceAnalysis

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'user', 'context_type', 'created_at', 'updated_at']
    list_filter = ['context_type', 'created_at']
    search_fields = ['session_id', 'user']

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['conversation', 'role', 'timestamp', 'tokens_used']
    list_filter = ['role', 'timestamp']
    search_fields = ['content']

@admin.register(AITask)
class AITaskAdmin(admin.ModelAdmin):
    list_display = ['task_type', 'status', 'created_at', 'completed_at']
    list_filter = ['status', 'task_type']
    search_fields = ['description']

@admin.register(DeviceAnalysis)
class DeviceAnalysisAdmin(admin.ModelAdmin):
    list_display = ['device', 'analysis_type', 'severity', 'created_at']
    list_filter = ['analysis_type', 'severity', 'created_at']
    search_fields = ['device__name', 'findings']
