from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.auth import update_session_auth_hash
from django.conf import settings
from django.utils import timezone
import json, os, subprocess, re

# Imports dos Modelos e Forms
from devices.models import Device, DeviceHistory, InterfaceData, DeviceBackup, TerminalLog, UserProfile
from .models import SystemSettings
from .forms import DeviceForm, UserRegisterForm, UserProfileForm, SettingsForm
from net_tools.utils import perform_device_backup

# === FUNÇÕES AUXILIARES (SNMP) ===
def snmp_get_raw(ip, community, oid):
    """Pega valor bruto via SNMP"""
    try:
        cmd = ['snmpget', '-v2c', '-c', community, '-O', 'qv', '-t', '1', '-r', '1', ip, oid]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, text=True)
        return res.stdout.strip().replace('"', '')
    except: return None

def format_uptime(timeticks):
    try:
        val = int(timeticks) // 100
        d = val // 86400
        h = (val % 86400) // 3600
        m = (val % 3600) // 60
        return f"{d}d {h}h {m}m", val
    except: return "-", 0

# === DASHBOARD E LISTAS ===
@login_required
def home(request):
    devices = Device.objects.filter(is_active=True)
    ctx = {
        'devices': devices, 
        'total_devices': devices.count(), 
        'online_devices': devices.filter(is_online=True).count(), 
        'offline_devices': devices.filter(is_online=False).count()
    }
    return render(request, 'core_system/home.html', ctx)

@login_required
def device_list(request):
    return render(request, 'core_system/device_list.html', {'devices': Device.objects.filter(is_active=True).order_by('name')})

@login_required
def inventory_view(request):
    """View do Inventário (Causa provável do Erro 500 se estivesse faltando)"""
    devices = Device.objects.filter(is_active=True).order_by('vendor', 'name')
    context = {
        'devices': devices,
        'total_assets': devices.count(),
        'total_huawei': devices.filter(vendor='Huawei').count(),
        'total_mikrotik': devices.filter(vendor='MikroTik').count(),
    }
    return render(request, 'core_system/inventory.html', context)

@login_required
def device_detail(request, pk):
    d = get_object_or_404(Device, pk=pk)
    hist = DeviceHistory.objects.filter(device=d).order_by('-timestamp')[:50]
    
    labels = [h.timestamp.strftime('%H:%M') for h in reversed(hist)]
    data_pppoe = [h.pppoe_count for h in reversed(hist)]
    data_cpu = [h.cpu_usage for h in reversed(hist)]

    context = {
        'device': d,
        'current_cpu': d.last_cpu if d.last_cpu else 0,
        'current_pppoe': d.last_pppoe_count if d.last_pppoe_count else 0,
        'uptime': d.uptime_str,
        'interfaces': InterfaceData.objects.filter(device=d).order_by('name'),
        'terminal_logs': TerminalLog.objects.filter(device=d).order_by('-start_time')[:20],
        'graph_labels': json.dumps(labels),
        'graph_pppoe': json.dumps(data_pppoe),
        'graph_cpu': json.dumps(data_cpu),
    }
    return render(request, 'core_system/device_detail.html', context)

# === AÇÕES DE BOTÕES (REDESCOBRIR, ATUALIZAR, BACKUP) ===
@login_required
def trigger_discovery(request, pk):
    d = get_object_or_404(Device, pk=pk)
    try:
        sys_descr = snmp_get_raw(d.ip, d.snmp_community, '.1.3.6.1.2.1.1.1.0')
        if not sys_descr or "Timeout" in sys_descr:
            messages.error(request, f"Falha SNMP: Sem resposta de {d.ip}")
            return redirect('device_detail', pk=pk)

        # Lógica Huawei
        if "Huawei" in sys_descr or "VRP" in sys_descr:
            d.vendor = 'Huawei'
            if "NE8000" in sys_descr:
                d.model_detected = "NE8000 Series"; d.oid_cpu = '.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5.9'
            elif "S67" in sys_descr or "S57" in sys_descr:
                d.model_detected = "Switch S-Series"; d.oid_cpu = '.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5.0'
            else:
                d.model_detected = "Huawei Genérico"; d.oid_cpu = '.1.3.6.1.4.1.2011.6.1.1.1.3.0'
            
            match = re.search(r'Version (\d+\.\d+)', sys_descr)
            if match: d.firmware_version = f"VRP {match.group(1)}"
            
            if "NE8000" in sys_descr or "NE40" in sys_descr:
                d.oid_pppoe = '.1.3.6.1.4.1.2011.5.25.40.4.1.11.0'; d.collect_pppoe = True
            else: d.collect_pppoe = False

        # Lógica MikroTik
        elif "RouterOS" in sys_descr:
            d.vendor = 'MikroTik'
            d.model_detected = sys_descr.split()[0]
            match = re.search(r'(\d+\.\d+(\.\d+)?)', sys_descr)
            if match: d.firmware_version = f"RouterOS {match.group(1)}"
            d.oid_cpu = '.1.3.6.1.2.1.25.3.3.1.2.1'
            d.oid_pppoe = '.1.3.6.1.4.1.14988.1.1.1.1.1.4.0'
            
        # Lógica Cisco/Linux
        elif "Cisco" in sys_descr:
            d.vendor = 'Cisco'; d.model_detected = "Cisco Device"; d.oid_cpu = '.1.3.6.1.4.1.9.2.1.56.0'
        elif "Linux" in sys_descr:
            d.vendor = 'Linux'; d.model_detected = "Linux Server"; d.oid_cpu = '.1.3.6.1.4.1.2021.11.10.0'

        d.save()
        messages.success(request, f"Sucesso! Detectado: {d.vendor} - {d.model_detected}")
        
    except Exception as e:
        messages.error(request, f"Erro interno: {str(e)}")
        
    return redirect('device_detail', pk=pk)

@login_required
def trigger_update(request, pk):
    d = get_object_or_404(Device, pk=pk)
    try:
        # Função interna rápida para pegar dados respeitando o cadastro
        def get_snmp(oid):
            ver = '-v2c' if d.snmp_version == '2c' else '-v1'
            cmd = ['snmpget', ver, '-c', d.snmp_community, '-O', 'qv', '-t', '1', '-r', '1', f"{d.ip}:{d.snmp_port}", oid]
            try:
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                val = res.stdout.strip().replace('"', '')
                return val if val and "Timeout" not in val else None
            except: return None

        # 1. CPU
        cpu = 0
        oid_cpu = d.oid_cpu
        # Fallback se não tiver OID gravado
        if not oid_cpu:
            if d.vendor == 'MikroTik': oid_cpu = '.1.3.6.1.2.1.25.3.3.1.2.1'
            elif d.vendor == 'Huawei': oid_cpu = '.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5.9' # Tenta NE
        
        if oid_cpu:
            val = get_snmp(oid_cpu)
            # Se falhar no Huawei NE, tenta Switch
            if not val and d.vendor == 'Huawei': 
                val = get_snmp('.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5.0')
            
            if val and val.isdigit(): cpu = int(val)

        # 2. PPPoE
        pppoe = 0
        if d.collect_pppoe:
            oid_ppp = d.oid_pppoe
            if not oid_ppp:
                if d.vendor == 'MikroTik': oid_ppp = '.1.3.6.1.4.1.14988.1.1.1.1.1.4.0'
                elif d.vendor == 'Huawei': oid_ppp = '.1.3.6.1.4.1.2011.5.25.40.4.1.11.0'
            
            if oid_ppp:
                val = get_snmp(oid_ppp)
                if val and val.isdigit(): pppoe = int(val)

        # 3. Uptime
        upt_str = "-"
        raw_upt = get_snmp('.1.3.6.1.2.1.1.3.0') # OID Uptime Padrão
        if raw_upt:
            # Formata grosseiramente só pra mostrar na tela
            upt_str = raw_upt

        # Salva
        d.last_cpu = str(cpu)
        d.last_pppoe_count = str(pppoe)
        d.uptime_str = upt_str
        d.is_online = (upt_str != "-")
        d.last_run = timezone.now()
        d.save()
        
        DeviceHistory.objects.create(device=d, cpu_usage=cpu, pppoe_count=pppoe, is_online=d.is_online)
        messages.success(request, f"Atualizado! CPU: {cpu}% | PPPoE: {pppoe}")

    except Exception as e:
        messages.error(request, f"Erro: {str(e)}")
        
    return redirect('device_detail', pk=pk)

@login_required
def trigger_backup(request, pk):
    try: perform_device_backup(get_object_or_404(Device, pk=pk)); messages.success(request, "Backup OK!")
    except Exception as e: messages.error(request, str(e))
    return redirect('device_detail', pk=pk)

# === USUÁRIOS ===
@login_required
def user_list(request):
    if not request.user.is_superuser: return redirect('dashboard')
    users = User.objects.all()
    for u in users: 
        if not hasattr(u, 'profile'): UserProfile.objects.create(user=u)
    return render(request, 'core_system/user_list.html', {'users': users})

@login_required
def user_create(request):
    if not request.user.is_superuser: return redirect('dashboard')
    avatar_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
    if not os.path.exists(avatar_dir): os.makedirs(avatar_dir)
    avatars = [f for f in os.listdir(avatar_dir) if f.lower().endswith(('.png','.jpg','.jpeg'))]
    if request.method == 'POST':
        u_form = UserRegisterForm(request.POST); p_form = UserProfileForm(request.POST, request.FILES)
        if u_form.is_valid() and p_form.is_valid():
            user = u_form.save(commit=False); user.set_password(u_form.cleaned_data['password']); user.save()
            if not hasattr(user, 'profile'): UserProfile.objects.create(user=user)
            role = u_form.cleaned_data['role']; user.profile.is_guest = (role=='guest'); user.is_superuser = (role=='admin'); user.is_staff = (role!='guest'); user.save()
            pf = p_form.save(commit=False)
            if request.POST.get('selected_avatar'): pf.avatar.name = f'avatars/{request.POST.get("selected_avatar")}'
            pf.save(); messages.success(request, 'Criado!'); return redirect('user_list')
    else: u_form, p_form = UserRegisterForm(), UserProfileForm()
    return render(request, 'core_system/user_form.html', {'u_form': u_form, 'p_form': p_form, 'title': 'Novo', 'available_avatars': avatars, 'media_url': settings.MEDIA_URL})

@login_required
def user_edit(request, pk):
    if not request.user.is_superuser: return redirect('dashboard')
    user_obj = get_object_or_404(User, pk=pk)
    if not hasattr(user_obj, 'profile'): UserProfile.objects.create(user=user_obj)
    avatar_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
    if not os.path.exists(avatar_dir): os.makedirs(avatar_dir)
    avatars = [f for f in os.listdir(avatar_dir) if f.lower().endswith(('.png','.jpg','.jpeg'))]
    if request.method == 'POST':
        if 'delete_image' in request.POST:
            try: os.remove(os.path.join(avatar_dir, request.POST.get('delete_image')))
            except: pass
            return redirect('user_edit', pk=pk)
        u_form = UserRegisterForm(request.POST, instance=user_obj); p_form = UserProfileForm(request.POST, request.FILES, instance=user_obj.profile)
        if u_form.is_valid() and p_form.is_valid():
            user = u_form.save(commit=False); pwd = u_form.cleaned_data.get('password')
            if pwd: user.set_password(pwd); 
            if user.pk == request.user.pk: update_session_auth_hash(request, user)
            role = u_form.cleaned_data['role']; user.profile.is_guest = (role=='guest'); user.is_superuser = (role=='admin'); user.is_staff = (role!='guest'); user.save()
            pf = p_form.save(commit=False)
            if request.POST.get('selected_avatar'): pf.avatar.name = f'avatars/{request.POST.get("selected_avatar")}'
            pf.save(); messages.success(request, 'Atualizado!'); return redirect('user_list')
    else:
        role = 'admin' if user_obj.is_superuser else ('guest' if user_obj.profile.is_guest else 'user')
        u_form = UserRegisterForm(instance=user_obj, initial={'role': role}); p_form = UserProfileForm(instance=user_obj.profile)
    return render(request, 'core_system/user_form.html', {'u_form': u_form, 'p_form': p_form, 'title': f'Editar {user_obj.username}', 'available_avatars': avatars, 'media_url': settings.MEDIA_URL})

@login_required
def user_delete(request, pk):
    if not request.user.is_superuser: return redirect('dashboard')
    u = get_object_or_404(User, pk=pk)
    if request.method == 'POST': u.delete(); return redirect('user_list')
    return render(request, 'core_system/user_confirm_delete.html', {'user_obj': u})

# === CONFIGURAÇÕES ===
@login_required
def settings_view(request):
    settings_obj = SystemSettings.load()
    if request.method == 'POST':
        form = SettingsForm(request.POST, instance=settings_obj)
        if form.is_valid(): form.save(); messages.success(request, 'Configurações salvas!'); return redirect('settings_view')
    else: form = SettingsForm(instance=settings_obj)
    return render(request, 'core_system/settings.html', {'form': form})

# === CRUD DEVICES (ADICIONAR, EDITAR, DELETAR) ===
@login_required
def device_add(request):
    if request.method=='POST':
        f=DeviceForm(request.POST); 
        if f.is_valid(): f.save(); return redirect('device_list')
    else: f=DeviceForm()
    return render(request, 'core_system/device_form.html', {'form': f, 'title': 'Novo'})

@login_required
def device_edit(request, pk):
    d=get_object_or_404(Device, pk=pk); old=d.password
    if request.method=='POST':
        f=DeviceForm(request.POST, instance=d)
        if f.is_valid(): nd=f.save(commit=False); 
        if not nd.password: nd.password=old
        nd.save(); return redirect('device_list')
    else: f=DeviceForm(instance=d)
    return render(request, 'core_system/device_form.html', {'form': f, 'title': f'Edit {d.name}'})

@login_required
def device_delete(request, pk):
    d=get_object_or_404(Device, pk=pk)
    if request.method=='POST': d.is_active=False; d.save(); return redirect('device_list')
    return render(request, 'core_system/device_confirm_delete.html', {'device': d})

# === OUTROS (BACKUPS, TERMINAL, LOGS) ===
@login_required
def backup_manager(request): return render(request, 'core_system/backup_list.html', {'backups': DeviceBackup.objects.select_related('device').order_by('-created_at')})

@login_required
def multi_terminal(request): return render(request, 'core_system/multi_terminal.html', {'devices': Device.objects.filter(is_active=True)})

@login_required
def delete_terminal_log(request, log_id):
    l=get_object_or_404(TerminalLog, id=log_id); did=l.device.id; l.delete()
    return redirect('device_detail', pk=did)
