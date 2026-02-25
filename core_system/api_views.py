"""API Views para Configuracoes do Sistema"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json, os, subprocess
from core_system.models import SystemSettings

@csrf_exempt
@require_http_methods(["GET"])
def api_get_settings(request):
    s = SystemSettings.load()
    return JsonResponse({"success": True, "data": {
        "cpu_warning_threshold": s.cpu_warning_threshold,
        "cpu_critical_threshold": s.cpu_critical_threshold,
        "pppoe_drop_alert": s.pppoe_drop_alert,
        "ping_timeout": s.ping_timeout,
        "telegram_enabled": s.telegram_enabled,
        "telegram_bot_token": s.telegram_bot_token,
        "telegram_chat_id": s.telegram_chat_id,
        "keep_logs_days": s.keep_logs_days,
        "keep_backups_days": s.keep_backups_days,
        "system_name": s.system_name,
        "maintenance_mode": s.maintenance_mode,
        "librenms_enabled": s.librenms_enabled,
        "librenms_url": s.librenms_url,
        "librenms_api_token": s.librenms_api_token,
        "phpipam_enabled": s.phpipam_enabled,
        "phpipam_url": s.phpipam_url,
        "phpipam_app_id": s.phpipam_app_id,
        "phpipam_app_key": s.phpipam_app_key,
        "phpipam_user": s.phpipam_user,
        "phpipam_password": s.phpipam_password,
        "ai_enabled": s.ai_enabled,
        "ai_provider": s.ai_provider,
        "groq_api_key": s.groq_api_key,
        "groq_model": s.groq_model,
        "ai_temperature": s.ai_temperature,
        "ai_max_tokens": s.ai_max_tokens,
        "ai_system_prompt": s.ai_system_prompt,
        "git_enabled": s.git_enabled,
        "git_repo_url": s.git_repo_url,
        "git_branch": s.git_branch,
        "git_auto_backup": s.git_auto_backup,
        "git_backup_frequency": s.git_backup_frequency,
    }})

@csrf_exempt
@require_http_methods(["POST"])
def api_save_settings(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        s = SystemSettings.load()
        for k, v in data.items():
            if hasattr(s, k): setattr(s, k, v)
        s.save()
        return JsonResponse({"success": True, "message": "Salvo!"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def api_test_librenms(request):
    try:
        import requests
        s = SystemSettings.load()
        h = {"X-Auth-Token": s.librenms_api_token}
        r = requests.get(s.librenms_url + "/api/v1/devices", headers=h, timeout=10)
        if r.status_code == 200:
            return JsonResponse({"success": True, "message": "OK! " + str(r.json().get("count",0)) + " dispositivos"})
        return JsonResponse({"success": False, "error": "HTTP " + str(r.status_code)})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})

@csrf_exempt
@require_http_methods(["POST"])
def api_test_phpipam(request):
    try:
        import requests
        s = SystemSettings.load()
        url = s.phpipam_url + "/api/" + s.phpipam_app_id + "/user/"
        r = requests.post(url, auth=(s.phpipam_user, s.phpipam_password), timeout=10)
        if r.status_code == 200: return JsonResponse({"success": True, "message": "phpIPAM OK!"})
        return JsonResponse({"success": False, "error": "HTTP " + str(r.status_code)})
    except Exception as e: return JsonResponse({"success": False, "error": str(e)})

@csrf_exempt
@require_http_methods(["POST"])
def api_test_groq(request):
    try:
        import requests
        s = SystemSettings.load()
        h = {"Authorization": "Bearer " + s.groq_api_key, "Content-Type": "application/json"}
        d = {"model": s.groq_model, "messages": [{"role": "user", "content": "Hi"}], "max_tokens": 5}
        r = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=h, json=d, timeout=30)
        if r.status_code == 200: return JsonResponse({"success": True, "message": "Groq OK!"})
        return JsonResponse({"success": False, "error": "HTTP " + str(r.status_code)})
    except Exception as e: return JsonResponse({"success": False, "error": str(e)})

@csrf_exempt
@require_http_methods(["POST"])
def api_git_status(request):
    try:
        os.chdir("/opt/lorcgr")
        r = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        if r.returncode != 0: return JsonResponse({"success": True, "is_repo": False})
        lines = r.stdout.strip().split(chr(10)) if r.stdout.strip() else []
        modified = len([l for l in lines if l])
        br = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True)
        cmt = subprocess.run(["git", "log", "-1", "--format=%h - %s (%cr)"], capture_output=True, text=True)
        return JsonResponse({"success": True, "is_repo": True, "branch": br.stdout.strip(), "modified_files": modified, "last_commit": cmt.stdout.strip()})
    except Exception as e: return JsonResponse({"success": False, "error": str(e)})

@csrf_exempt
@require_http_methods(["POST"])
def api_git_backup(request):
    try:
        os.chdir("/opt/lorcgr")
        s = SystemSettings.load()
        import datetime
        subprocess.run(["git", "add", "-A"], check=True)
        msg = "Backup " + datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        subprocess.run(["git", "commit", "-m", msg], check=True)
        subprocess.run(["git", "push", "origin", s.git_branch or "main"], check=True)
        return JsonResponse({"success": True, "message": "Backup OK: " + msg})
    except Exception as e: return JsonResponse({"success": False, "error": str(e)})

@csrf_exempt
@require_http_methods(["POST"])
def api_git_init(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        os.chdir("/opt/lorcgr")
        if os.path.exists(".git"): return JsonResponse({"success": True, "message": "Ja existe"})
        subprocess.run(["git", "init"], check=True)
        subprocess.run(["git", "config", "user.email", "lorcgr@local"], check=True)
        subprocess.run(["git", "config", "user.name", "LOR CGR"], check=True)
        if data.get("repo_url"): subprocess.run(["git", "remote", "add", "origin", data["repo_url"]], check=True)
        with open(".gitignore", "w") as f: f.write("venv/\n*.pyc\n__pycache__/\n*.log\ndb.sqlite3\n.env\nbackups/\nstaticfiles/\n")
        return JsonResponse({"success": True, "message": "Git iniciado!"})
    except Exception as e: return JsonResponse({"success": False, "error": str(e)})
