import React, { useState, useEffect } from 'react';
import { settingsApi } from '../lib/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('apis');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Settings from backend
  const [settings, setSettings] = useState({
    librenms_enabled: true,
    librenms_url: '',
    librenms_api_token: '',
    phpipam_enabled: true,
    phpipam_url: '',
    phpipam_app_id: '',
    phpipam_app_key: '',
    phpipam_user: '',
    phpipam_password: '',
    ai_enabled: true,
    ai_provider: 'groq',
    groq_api_key: '',
    groq_model: 'llama-3.3-70b-versatile',
    ai_temperature: 0.7,
    ai_max_tokens: 4096,
    ai_system_prompt: '',
    git_enabled: false,
    git_repo_url: '',
    git_branch: 'main',
    git_auto_backup: false,
    git_backup_frequency: 'daily',
    git_status: null,
  });

  // Users mock
  const [users] = useState([
    { id: 1, username: 'admin', email: 'admin@lorcgr.local', role: 'admin', isActive: true }
  ]);

  const tabs = [
    { id: 'apis', label: 'APIs Externas', icon: '🔌' },
    { id: 'ai', label: 'IA (Groq)', icon: '🤖' },
    { id: 'git', label: 'Git/Backup', icon: '📦' },
    { id: 'users', label: 'Usuários', icon: '👥' },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsApi.get();
      if (res.success && res.data) {
        setSettings(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao carregar configurações: ' + error.message });
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await settingsApi.save(settings);
      if (res.success) {
        setMessage({ type: 'success', text: '✅ Configurações salvas com sucesso!' });
      } else {
        setMessage({ type: 'error', text: '❌ Erro: ' + res.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Erro: ' + error.message });
    }
    setLoading(false);
  };

  const testLibreNMS = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.testLibreNMS();
      setMessage({ type: res.success ? 'success' : 'error', text: res.success ? '✅ ' + res.message : '❌ ' + res.error });
    } catch (e) {
      setMessage({ type: 'error', text: '❌ Erro: ' + e.message });
    }
    setLoading(false);
  };

  const testPhpIPAM = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.testPhpIPAM();
      setMessage({ type: res.success ? 'success' : 'error', text: res.success ? '✅ ' + res.message : '❌ ' + res.error });
    } catch (e) {
      setMessage({ type: 'error', text: '❌ Erro: ' + e.message });
    }
    setLoading(false);
  };

  const testGroq = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.testGroq();
      setMessage({ type: res.success ? 'success' : 'error', text: res.success ? '✅ ' + res.message : '❌ ' + res.error });
    } catch (e) {
      setMessage({ type: 'error', text: '❌ Erro: ' + e.message });
    }
    setLoading(false);
  };

  const loadGitStatus = async () => {
    try {
      const res = await settingsApi.gitStatus();
      if (res.success) {
        setSettings(prev => ({ ...prev, git_status: res }));
      }
    } catch (e) {
      console.error('Erro ao carregar status Git:', e);
    }
  };

  const runGitBackup = async () => {
    setLoading(true);
    setMessage({ type: 'success', text: '📦 Enviando backup para GitHub...' });
    try {
      const res = await settingsApi.gitBackup();
      setMessage({ type: res.success ? 'success' : 'error', text: res.success ? '✅ ' + res.message : '❌ ' + res.error });
      loadGitStatus();
    } catch (e) {
      setMessage({ type: 'error', text: '❌ Erro: ' + e.message });
    }
    setLoading(false);
  };

  const initGit = async () => {
    if (!settings.git_repo_url) {
      setMessage({ type: 'error', text: '❌ Informe a URL do repositório' });
      return;
    }
    setLoading(true);
    try {
      const res = await settingsApi.gitInit(settings.git_repo_url);
      setMessage({ type: res.success ? 'success' : 'error', text: res.success ? '✅ ' + res.message : '❌ ' + res.error });
      loadGitStatus();
    } catch (e) {
      setMessage({ type: 'error', text: '❌ Erro: ' + e.message });
    }
    setLoading(false);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={'p-4 rounded-lg ' + (message.type === 'success' ? 'bg-green-600/20 text-green-400 border border-green-600' : 'bg-red-600/20 text-red-400 border border-red-600')}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ' + (activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700')}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* APIs Tab */}
      {activeTab === 'apis' && (
        <div className="space-y-6">
          {/* LibreNMS */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-xl">📊</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">LibreNMS</h3>
                  <p className="text-sm text-gray-400">Monitoramento de rede</p>
                </div>
              </div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={settings.librenms_enabled} onChange={(e) => updateSetting('librenms_enabled', e.target.checked)} className="w-5 h-5 rounded" />
                <span className="text-gray-300">Ativo</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="url" value={settings.librenms_url} onChange={(e) => updateSetting('librenms_url', e.target.value)} placeholder="URL do LibreNMS" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              <input type="password" value={settings.librenms_api_token} onChange={(e) => updateSetting('librenms_api_token', e.target.value)} placeholder="API Token" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
            </div>
            <div className="mt-4 flex space-x-3">
              <button onClick={testLibreNMS} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">Testar</button>
            </div>
          </div>

          {/* phpIPAM */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-xl">🌐</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">phpIPAM</h3>
                  <p className="text-sm text-gray-400">Gerenciamento de IPs</p>
                </div>
              </div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={settings.phpipam_enabled} onChange={(e) => updateSetting('phpipam_enabled', e.target.checked)} className="w-5 h-5 rounded" />
                <span className="text-gray-300">Ativo</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="url" value={settings.phpipam_url} onChange={(e) => updateSetting('phpipam_url', e.target.value)} placeholder="URL do phpIPAM" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              <input type="text" value={settings.phpipam_app_id} onChange={(e) => updateSetting('phpipam_app_id', e.target.value)} placeholder="App ID" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              <input type="password" value={settings.phpipam_app_key} onChange={(e) => updateSetting('phpipam_app_key', e.target.value)} placeholder="App Key" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              <input type="text" value={settings.phpipam_user} onChange={(e) => updateSetting('phpipam_user', e.target.value)} placeholder="Usuário" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              <input type="password" value={settings.phpipam_password} onChange={(e) => updateSetting('phpipam_password', e.target.value)} placeholder="Senha" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
            </div>
            <div className="mt-4 flex space-x-3">
              <button onClick={testPhpIPAM} disabled={loading} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition">Testar</button>
            </div>
          </div>

          <button onClick={saveSettings} disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition">
            Salvar Configurações de API
          </button>
        </div>
      )}

      {/* AI Tab */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-xl">🤖</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Inteligência Artificial (Groq)</h3>
                  <p className="text-sm text-gray-400">Assistente de NOC especializado</p>
                </div>
              </div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={settings.ai_enabled} onChange={(e) => updateSetting('ai_enabled', e.target.checked)} className="w-5 h-5 rounded" />
                <span className="text-gray-300">Ativar</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Provedor</label>
                <select value={settings.ai_provider} onChange={(e) => updateSetting('ai_provider', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                  <option value="groq">Groq (Llama 3.3 70B)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Modelo</label>
                <select value={settings.groq_model} onChange={(e) => updateSetting('groq_model', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</option>
                  <option value="llama-3.1-70b-versatile">Llama 3.1 70B Versatile</option>
                  <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant</option>
                  <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">API Key do Groq</label>
                <input type="password" value={settings.groq_api_key} onChange={(e) => updateSetting('groq_api_key', e.target.value)} placeholder="gsk_..." className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Temperatura (0.0 - 1.0)</label>
                <input type="number" step="0.1" min="0" max="1" value={settings.ai_temperature} onChange={(e) => updateSetting('ai_temperature', parseFloat(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Tokens</label>
                <input type="number" value={settings.ai_max_tokens} onChange={(e) => updateSetting('ai_max_tokens', parseInt(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-1">Prompt do Sistema (Personalidade da IA)</label>
              <textarea 
                value={settings.ai_system_prompt} 
                onChange={(e) => updateSetting('ai_system_prompt', e.target.value)} 
                placeholder="Você é um assistente especializado em redes e infraestrutura de TI..."
                rows={5}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Define como a IA deve se comportar e responder</p>
            </div>

            <div className="mt-4 flex space-x-3">
              <button onClick={testGroq} disabled={loading} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition">Testar Conexão</button>
            </div>
          </div>

          <button onClick={saveSettings} disabled={loading} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition">
            Salvar Configurações de IA
          </button>
        </div>
      )}

      {/* Git Tab */}
      {activeTab === 'git' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-xl">📦</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Backup no GitHub</h3>
                  <p className="text-sm text-gray-400">Sincronize configurações e códigos</p>
                </div>
              </div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={settings.git_enabled} onChange={(e) => updateSetting('git_enabled', e.target.checked)} className="w-5 h-5 rounded" />
                <span className="text-gray-300">Ativar</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">URL do Repositório</label>
                <input type="text" value={settings.git_repo_url} onChange={(e) => updateSetting('git_repo_url', e.target.value)} placeholder="https://github.com/usuario/repo.git" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Branch</label>
                <input type="text" value={settings.git_branch} onChange={(e) => updateSetting('git_branch', e.target.value)} placeholder="main" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Frequência de Backup</label>
                <select value={settings.git_backup_frequency} onChange={(e) => updateSetting('git_backup_frequency', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                  <option value="hourly">A cada hora</option>
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={settings.git_auto_backup} onChange={(e) => updateSetting('git_auto_backup', e.target.checked)} className="w-5 h-5 rounded" />
                  <span className="text-gray-300">Backup automático</span>
                </label>
              </div>
            </div>
          </div>

          {/* Git Status */}
          {settings.git_status && settings.git_status.is_repo && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Status do Repositório</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🌿</div>
                  <div className="text-gray-400 text-sm">Branch</div>
                  <div className="text-white font-medium">{settings.git_status.branch || '-'}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">📝</div>
                  <div className="text-gray-400 text-sm">Arquivos Modificados</div>
                  <div className="text-white font-medium">{settings.git_status.modified_files || 0}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 text-center col-span-2">
                  <div className="text-2xl mb-1">💾</div>
                  <div className="text-gray-400 text-sm">Último Commit</div>
                  <div className="text-white font-medium text-sm">{settings.git_status.last_commit || '-'}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button onClick={loadGitStatus} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition">
              Verificar Status
            </button>
            <button onClick={runGitBackup} disabled={loading} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition">
              Fazer Backup Agora
            </button>
          </div>

          <button onClick={saveSettings} disabled={loading} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition">
            Salvar Configurações Git
          </button>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Usuários do Sistema</h3>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Usuário</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Função</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-white">{user.username}</td>
                    <td className="px-4 py-3 text-gray-300">{user.email}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs bg-purple-600">Admin</span></td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs bg-green-600/20 text-green-400">Ativo</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
