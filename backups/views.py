from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import psycopg2
from pathlib import Path

def get_db_connection():
    return psycopg2.connect(
        dbname='lorcgr',
        user='lorcgr',
        password='Lor#Vision#2016',
        host='localhost'
    )

BACKUP_DIR = Path('/opt/lorcgr/backups')

@csrf_exempt
@require_http_methods(["GET"])
def list_backups(request):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, device_name, filename, size_bytes, created_at, status FROM device_backups ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        backups = [{'id': r[0], 'device_name': r[1], 'filename': r[2], 'size_bytes': r[3], 'created_at': r[4].isoformat() if r[4] else None, 'status': r[5]} for r in rows]
        return JsonResponse({'backups': backups})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def download_backup(request):
    try:
        backup_id = request.GET.get('id')
        if not backup_id:
            return JsonResponse({'error': 'ID obrigatorio'}, status=400)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT device_name, filename FROM device_backups WHERE id = %s", [backup_id])
        row = cursor.fetchone()
        conn.close()
        if not row:
            return JsonResponse({'error': 'Backup nao encontrado'}, status=404)
        device_name, filename = row
        for subdir in BACKUP_DIR.iterdir():
            if subdir.is_dir():
                file_path = subdir / filename
                if file_path.exists():
                    response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=filename)
                    response['Content-Type'] = 'text/plain'
                    return response
        return JsonResponse({'error': 'Arquivo nao encontrado: ' + filename}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def delete_backup(request):
    try:
        data = json.loads(request.body)
        backup_id = data.get('id')
        if not backup_id:
            return JsonResponse({'error': 'ID obrigatorio'}, status=400)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT device_name, filename FROM device_backups WHERE id = %s", [backup_id])
        row = cursor.fetchone()
        if not row:
            conn.close()
            return JsonResponse({'error': 'Backup nao encontrado'}, status=404)
        device_name, filename = row
        for subdir in BACKUP_DIR.iterdir():
            if subdir.is_dir():
                file_path = subdir / filename
                if file_path.exists():
                    file_path.unlink()
                    break
        cursor.execute("DELETE FROM device_backups WHERE id = %s", [backup_id])
        conn.commit()
        conn.close()
        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
