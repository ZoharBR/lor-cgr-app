import React, { useState, useEffect } from 'react';
import { settingsApi } from '../lib/api';

const Integrations = () => {
  const [activeTab, setActiveTab] = useState('status');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
    git_enabled: false,
    git_repo_url: '',
    git_branch: 'main',
    git_status: null,
  });

  const [testResults, setTestResults] = useState({
    librenms: null,
    phpipam: null,
    groq: null,
    git: null,
  });

  const tabs = [
    { id: 'status', label: 'Status', icon: '📊' },
    { id: 'librenms', label: 'LibreNMS', icon: '📈' },
    { id: 'phpipam', label: 'phpIPAM', icon: '🌐' },
    { id: 'git', label: 'Git/Backup', icon: '📦' },
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
    } catch (e) {
      console.error('Erro ao carregar:', e);
    }
  };

  const testAll = async () => {
    setLoading(true);
    setMessage({ type: 'success', text: 'Testando todas as integrações...' });
    
    const results = { librenms: null, phpipam: null, groq: null, git: null };
    
    try {
      const res = await settingsApi.testLibreNMS();
      results.librenms = res;
    } catch (e) {
      results.librenms = { success: false, error: e.message };
    }
    
    try {
      const res = await settingsApi.testPhpIPAM();
      results.phpipam = res;
    } catch (e) {
      results.phpipam = { success: false, error: e.message };
    }
    
    try {
      const res = await settingsApi.testGroq();
      results.groq = res;
    } catch (e) {
      results.groq = { success: false, error: e.message };
    }
    
    try {
      const res = await settingsApi.gitStatus();
      results.git = res;
    } catch (e) {
      results.git = { success: false, error: e.message };
    }
    
    setTestResults(results);
    setMessage({ type: 'success', text: '✅ Testes concluídos!' });
    setLoading(false);
  };

  const runGitBackup = async () => {
    setLoading(true);
    setMessage({ type: 'success', text: '📦 Enviando backup para GitHub...' });
    try {
      const res = await settingsApi.gitBackup();
      setMessage({ type: res.success ? 'success' : 'error', text: res.success ? '✅ ' + res.message : '❌ ' + res.error });
    } catch (e) {
      setMessage({ type: 'error', text: '❌ Erro: ' + e.message });
    }
    setLoading(false);
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

      {/* Status Tab */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Status das Integrações</h3>
            <button onClick={testAll} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">
              Testar Todas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LibreNMS */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">📈</div>
                  <div>
                    <h4 className="text-white font-medium">LibreNMS</h4>
                    <p className="text-gray-400 text-sm">Monitoramento</p>
                  </div>
                </div>
                <span className={'px-3 py-1 rounded-full text-xs ' + (settings.librenms_enabled ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400')}>
                  {settings.librenms_enabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              {testResults.librenms && (
                <div className={'mt-4 p-3 rounded ' + (testResults.librenms.success ? 'bg-green-600/10' : 'bg-red-600/10')}>
                  <p className={testResults.librenms.success ? 'text-green-400' : 'text-red-400'} className="text-sm">
                    {testResults.librenms.success ? '✅ ' + testResults.librenms.message : '❌ ' + testResults.librenms.error}
                  </p>
                </div>
              )}
            </div>

            {/* phpIPAM */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center text-2xl">🌐</div>
                  <div>
                    <h4 className="text-white font-medium">phpIPAM</h4>
                    <p className="text-gray-400 text-sm">Gerenciamento IP</p>
                  </div>
                </div>
                <span className={'px-3 py-1 rounded-full text-xs ' + (settings.phpipam_enabled ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400')}>
                  {settings.phpipam_enabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              {testResults.phpipam && (
                <div className={'mt-4 p-3 rounded ' + (testResults.phpipam.success ? 'bg-green-600/10' : 'bg-red-600/10')}>
                  <p className={testResults.phpipam.success ? 'text-green-400' : 'text-red-400'} className="text-sm">
                    {testResults.phpipam.success ? '✅ ' + testResults.phpipam.message : '❌ ' + testResults.phpipam.error}
                  </p>
                </div>
              )}
            </div>

            {/* Groq AI */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-2xl">🤖</div>
                  <div>
                    <h4 className="text-white font-medium">Groq AI</h4>
                    <p className="text-gray-400 text-sm">Assistente NOC</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs bg-green-600/20 text-green-400">
                  {settings.groq_model || 'Llama 3.3'}
                </span>
              </div>
              {testResults.groq && (
                <div className={'mt-4 p-3 rounded ' + (testResults.groq.success ? 'bg-green-600/10' : 'bg-red-600/10')}>
                  <p className={testResults.groq.success ? 'text-green-400' : 'text-red-400'} className="text-sm">
                    {testResults.groq.success ? '✅ ' + testResults.groq.message : '❌ ' + testResults.groq.error}
                  </p>
                </div>
              )}
            </div>

            {/* Git */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-2xl">📦</div>
                  <div>
                    <h4 className="text-white font-medium">Git/GitHub</h4>
                    <p className="text-gray-400 text-sm">Backup</p>
                  </div>
                </div>
                <span className={'px-3 py-1 rounded-full text-xs ' + (settings.git_enabled ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400')}>
                  {settings.git_enabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              {testResults.git && testResults.git.is_repo && (
                <div className="mt-4 p-3 rounded bg-gray-700/50">
                  <p className="text-gray-300 text-sm">Branch: <span className="text-white">{testResults.git.branch}</span></p>
                  <p className="text-gray-300 text-sm">Modificados: <span className="text-white">{testResults.git.modified_files}</span></p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LibreNMS Tab */}
      {activeTab === 'librenms' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">LibreNMS - Monitoramento</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">URL</label>
              <input type="url" value={settings.librenms_url} readOnly className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-300" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">API Token</label>
              <input type="password" value={settings.librenms_api_token ? '••••••••' : ''} readOnly className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">Configure as credenciais em Configurações → APIs Externas</p>
          </div>
        </div>
      )}

      {/* phpIPAM Tab */}
      {activeTab === 'phpipam' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">phpIPAM - Gerenciamento de IPs</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">URL</label>
              <input type="url" value={settings.phpipam_url} readOnly className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-300" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">App ID</label>
              <input type="text" value={settings.phpipam_app_id} readOnly className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">Configure as credenciais em Configurações → APIs Externas</p>
          </div>
        </div>
      )}

      {/* Git Tab */}
      {activeTab === 'git' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Backup no GitHub</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Repositório</label>
                <input type="text" value={settings.git_repo_url} readOnly className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-300" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Branch</label>
                <input type="text" value={settings.git_branch} readOnly className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-300" />
              </div>
              {settings.git_status && settings.git_status.is_repo && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300"><span className="text-gray-400">Último commit:</span> {settings.git_status.last_commit}</p>
                  <p className="text-gray-300"><span className="text-gray-400">Arquivos modificados:</span> {settings.git_status.modified_files}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-3">
            <button onClick={() => settingsApi.gitStatus().then(res => setSettings(prev => ({...prev, git_status: res})))} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition">
              Verificar Status
            </button>
            <button onClick={runGitBackup} disabled={loading} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition">
              Fazer Backup Agora
            </button>
          </div>
          
          <p className="text-gray-400 text-sm text-center">Configure o Git em Configurações → Git/Backup</p>
        </div>
      )}
    </div>
  );
};

export default Integrations;
