from django import forms
from django.contrib.auth.models import User
from devices.models import Device, UserProfile
from .models import SystemSettings

# === FORMULÁRIO DE CONFIGURAÇÕES GLOBAIS ===
class SettingsForm(forms.ModelForm):
    class Meta:
        model = SystemSettings
        fields = '__all__'
        widgets = {
            'cpu_warning_threshold': forms.NumberInput(attrs={'class': 'form-control'}),
            'cpu_critical_threshold': forms.NumberInput(attrs={'class': 'form-control'}),
            'pppoe_drop_alert': forms.NumberInput(attrs={'class': 'form-control'}),
            'ping_timeout': forms.NumberInput(attrs={'class': 'form-control'}),
            'telegram_enabled': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'telegram_bot_token': forms.TextInput(attrs={'class': 'form-control'}),
            'telegram_chat_id': forms.TextInput(attrs={'class': 'form-control'}),
            'keep_logs_days': forms.NumberInput(attrs={'class': 'form-control'}),
            'keep_backups_days': forms.NumberInput(attrs={'class': 'form-control'}),
            'system_name': forms.TextInput(attrs={'class': 'form-control'}),
            'maintenance_mode': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

# === FORMULÁRIO DE EQUIPAMENTOS ===
class DeviceForm(forms.ModelForm):
    class Meta:
        model = Device
        # AQUI ESTÃO OS CAMPOS QUE DEVEM BATER COM O MODELS.PY
        fields = [
            'name', 'ip', 'vendor', 'tags', 
            'is_active', 'collect_pppoe', 'auto_backup', 'backup_hour',
            'user', 'password', 'ssh_port', 
            'snmp_community', 'snmp_port', 'snmp_version'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nome do Equipamento'}),
            'ip': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '192.168.x.x'}),
            'vendor': forms.Select(attrs={'class': 'form-select'}),
            'tags': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: Borda, Concentrador'}),
            
            'user': forms.TextInput(attrs={'class': 'form-control'}),
            'password': forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Deixe vazio para manter a atual'}),
            'ssh_port': forms.NumberInput(attrs={'class': 'form-control'}),
            
            'snmp_community': forms.TextInput(attrs={'class': 'form-control'}),
            'snmp_port': forms.NumberInput(attrs={'class': 'form-control'}),
            'snmp_version': forms.Select(attrs={'class': 'form-select'}),
            
            'backup_hour': forms.TimeInput(attrs={'class': 'form-control', 'type': 'time'}),
            
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'collect_pppoe': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'auto_backup': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['password'].required = False

# === FORMULÁRIO DE USUÁRIOS ===
class UserRegisterForm(forms.ModelForm):
    first_name = forms.CharField(label="Nome Completo", widget=forms.TextInput(attrs={'class': 'form-control'}))
    email = forms.EmailField(label="E-mail", widget=forms.EmailInput(attrs={'class': 'form-control'}))
    password = forms.CharField(label="Senha", widget=forms.PasswordInput(attrs={'class': 'form-control'}), required=False)
    role = forms.ChoiceField(choices=[('admin','Admin'), ('user','User'), ('guest','Convidado')], widget=forms.Select(attrs={'class': 'form-select'}))

    class Meta:
        model = User
        fields = ['username', 'first_name', 'email'] 
        widgets = {'username': forms.TextInput(attrs={'class': 'form-control'})}

    def clean_password(self):
        pwd = self.cleaned_data.get('password')
        if not self.instance.pk and not pwd:
            raise forms.ValidationError("Senha obrigatória para novos usuários.")
        return pwd

class UserProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ['theme', 'address', 'birth_date', 'cellphone', 'gender', 'company', 'sector', 'avatar', 'guest_expiry']
        widgets = {
            'theme': forms.Select(attrs={'class': 'form-select'}),
            'address': forms.TextInput(attrs={'class': 'form-control'}),
            'birth_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'cellphone': forms.TextInput(attrs={'class': 'form-control'}),
            'gender': forms.Select(attrs={'class': 'form-select'}),
            'company': forms.TextInput(attrs={'class': 'form-control'}),
            'sector': forms.TextInput(attrs={'class': 'form-control'}),
            'avatar': forms.FileInput(attrs={'class': 'form-control'}),
            'guest_expiry': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }
