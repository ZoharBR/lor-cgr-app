import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('apis');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // API Settings
  const [apiSettings, setApiSettings] = useState({
    libreNms: { url: '', apiKey: '', enabled: false },
    phpIpam: { url: '', appId: '', appKey: '', enabled: false }
  });

  // Users - Mock data since no backend endpoint
  const [users, setUsers] = useState([
    { id: 1, username: 'admin', email: 'admin@lorcgr.local', role: 'admin', isActive: true, lastLogin: '2024-02-15 10:30' },
  ]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', role: 'viewer', isActive: true });

  // Theme
  const [theme, setTheme] = useState({ mode: 'dark', primaryColor: 'blue' });

  // AI Settings
  const [aiSettings, setAiSettings] = useState({ enabled: true, provider: 'openai', apiKey: '' });

  const tabs = [
    { id: 'apis', label: 'APIs Externas', icon: '🔌' },
    { id: 'users', label: 'Usuários', icon: '👥' },
    { id: 'theme', label: 'Aparência', icon: '🎨' },
    { id: 'ai', label: 'IA', icon: '🤖' }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const saved = localStorage.getItem('lorcgr-settings');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.apis) setApiSettings(data.apis);
      if (data.theme) setTheme(data.theme);
      if (data.ai) setAiSettings(data.ai);
    }
  };

  const saveSettings = (key, value) => {
    const saved = JSON.parse(localStorage.getItem('lorcgr-settings') || '{}');
    saved[key] = value;
    localStorage.setItem('lorcgr-settings', JSON.stringify(saved));
  };

  const testConnection = async (system) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const config = apiSettings[system];
      
      if (system === 'libreNms') {
        const res = await fetch(`${config.url}/api/v0/system`, {
          headers: { 'X-Auth-Token': config.apiKey }
        });
        const data = await res.json();
        if (data.system) {
          setMessage({ type: 'success', text: `✅ LibreNMS ${data.system.version} conectado!` });
          setApiSettings(prev => ({ ...prev, libreNms: { ...prev.libreNms, enabled: true } }));
        }
      } else if (system === 'phpIpam') {
        const res = await fetch(`${config.url}/api/${config.appId}/user/`, {
          headers: { 'Authorization': 'Basic ' + btoa('admin:' + config.appKey) }
        });
        const data = await res.json();
        if (data.data?.token) {
          setMessage({ type: 'success', text: '✅ phpIPAM conectado!' });
          setApiSettings(prev => ({ ...prev, phpIpam: { ...prev.phpIpam, enabled: true } }));
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Erro: ${error.message}` });
    }
    
    setLoading(false);
  };

  const saveApiSettings = () => {
    saveSettings('apis', apiSettings);
    setMessage({ type: 'success', text: '✅ Configurações de API salvas!' });
  };

  // Users
  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...userForm } : u));
      setMessage({ type: 'success', text: 'Usuário atualizado!' });
    } else {
      setUsers(prev => [...prev, { ...userForm, id: Date.now(), lastLogin: '-' }]);
      setMessage({ type: 'success', text: 'Usuário criado com sucesso!' });
    }
    setShowUserForm(false);
    setEditingUser(null);
    setUserForm({ username: '', email: '', password: '', role: 'viewer', isActive: true });
  };

  const editUser = (user) => {
    setUserForm({ ...user, password: '' });
    setEditingUser(user);
    setShowUserForm(true);
  };

  const deleteUser = (id) => {
    if (window.confirm('Excluir este usuário?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
      setMessage({ type: 'success', text: 'Usuário excluído!' });
    }
  };

  // Theme
  const saveThemeSettings = () => {
    saveSettings('theme', theme);
    localStorage.setItem('lorcgr-theme', JSON.stringify(theme));
    setMessage({ type: 'success', text: '✅ Tema salvo!' });
  };

  // AI
  const saveAiSettings = () => {
    saveSettings('ai', aiSettings);
    setMessage({ type: 'success', text: '✅ Configurações de IA salvas!' });
  };

  const roleLabels = { admin: 'Administrador', operator: 'Operador', viewer: 'Visualizador' };
  const roleColors = { admin: 'bg-purple-600', operator: 'bg-blue-600', viewer: 'bg-gray-600' };

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-600/20 text-green-400 border border-green-600' : 'bg-red-600/20 text-red-400 border border-red-600'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
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
              <span className={`px-3 py-1 rounded-full text-xs ${apiSettings.libreNms.enabled ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'}`}>
                {apiSettings.libreNms.enabled ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="url" value={apiSettings.libreNms.url} onChange={(e) => setApiSettings(prev => ({ ...prev, libreNms: { ...prev.libreNms, url: e.target.value } }))} placeholder="http://librenms.example.com" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              <input type="password" value={apiSettings.libreNms.apiKey} onChange={(e) => setApiSettings(prev => ({ ...prev, libreNms: { ...prev.libreNms, apiKey: e.target.value } }))} placeholder="API Token" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
            </div>
            <div className="mt-4 flex space-x-3">
              <button onClick={() => testConnection('libreNms')} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">Testar</button>
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
              <span className={`px-3 py-1 rounded-full text-xs ${apiSettings.phpIpam.enabled ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'}`}>
                {apiSettings.phpIpam.enabled ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="url" value={apiSettings.phpIpam.url} onChange={(e) => setApiSettings(prev => ({ ...prev, phpIpam: { ...prev.phpIpam, url: e.target.value } }))} placeholder="http://phpipam.example.com" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              <input type="text" value={apiSettings.phpIpam.appId} onChange={(e) => setApiSettings(prev => ({ ...prev, phpIpam: { ...prev.phpIpam, appId: e.target.value } }))} placeholder="App ID" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              <input type="password" value={apiSettings.phpIpam.appKey} onChange={(e) => setApiSettings(prev => ({ ...prev, phpIpam: { ...prev.phpIpam, appKey: e.target.value } }))} placeholder="App Key" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
            </div>
            <div className="mt-4 flex space-x-3">
              <button onClick={() => testConnection('phpIpam')} disabled={loading} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition">Testar</button>
            </div>
          </div>

          <button onClick={saveApiSettings} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition">
            Salvar Configurações de API
          </button>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Usuários do Sistema</h3>
            <button onClick={() => { setEditingUser(null); setUserForm({ username: '', email: '', password: '', role: 'viewer', isActive: true }); setShowUserForm(true); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">+ Novo Usuário</button>
          </div>

          {showUserForm && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h4 className="text-white font-medium mb-4">{editingUser ? 'Editar' : 'Novo'} Usuário</h4>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" value={userForm.username} onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))} required placeholder="Usuário" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                  <input type="email" value={userForm.email} onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))} required placeholder="Email" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                  <input type="password" value={userForm.password} onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))} required={!editingUser} placeholder="Senha" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                  <select value={userForm.role} onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))} className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                    <option value="viewer">Visualizador</option>
                    <option value="operator">Operador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={userForm.isActive} onChange={(e) => setUserForm(prev => ({ ...prev, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
                    <span className="text-gray-300">Usuário ativo</span>
                  </label>
                </div>
                <div className="flex space-x-3">
                  <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">Salvar</button>
                  <button type="button" onClick={() => { setShowUserForm(false); setEditingUser(null); }} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition">Cancelar</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Usuário</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Função</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-white">{user.username}</td>
                    <td className="px-4 py-3 text-gray-300">{user.email}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${roleColors[user.role]}`}>{roleLabels[user.role]}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${user.isActive ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{user.isActive ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => editUser(user)} className="text-blue-400 hover:text-blue-300 mr-3 text-sm">Editar</button>
                      <button onClick={() => deleteUser(user.id)} className="text-red-400 hover:text-red-300 text-sm">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Modo do Tema</h3>
            <div className="flex space-x-4">
              <button onClick={() => setTheme(prev => ({ ...prev, mode: 'dark' }))} className={`flex-1 p-6 rounded-lg border-2 transition ${theme.mode === 'dark' ? 'border-blue-500 bg-gray-700' : 'border-gray-600'}`}>
                <div className="text-3xl mb-2">🌙</div>
                <div className="text-white font-medium">Escuro</div>
              </button>
              <button onClick={() => setTheme(prev => ({ ...prev, mode: 'light' }))} className={`flex-1 p-6 rounded-lg border-2 transition ${theme.mode === 'light' ? 'border-blue-500 bg-gray-700' : 'border-gray-600'}`}>
                <div className="text-3xl mb-2">☀️</div>
                <div className="text-white font-medium">Claro</div>
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Cor Principal</h3>
            <div className="flex space-x-3">
              {['blue', 'purple', 'green', 'red', 'orange', 'pink'].map(color => (
                <button key={color} onClick={() => setTheme(prev => ({ ...prev, primaryColor: color }))}
                  className={`w-12 h-12 rounded-full border-2 transition ${theme.primaryColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color === 'blue' ? '#3b82f6' : color === 'purple' ? '#8b5cf6' : color === 'green' ? '#10b981' : color === 'red' ? '#ef4444' : color === 'orange' ? '#f97316' : '#ec4899' }}
                />
              ))}
            </div>
          </div>

          <button onClick={saveThemeSettings} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition">
            Salvar Tema
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
                  <h3 className="text-lg font-semibold text-white">Inteligência Artificial</h3>
                  <p className="text-sm text-gray-400">Análise automatizada de infraestrutura</p>
                </div>
              </div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={aiSettings.enabled} onChange={(e) => setAiSettings(prev => ({ ...prev, enabled: e.target.checked }))} className="w-5 h-5 rounded" />
                <span className="text-gray-300">Ativar</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={aiSettings.provider} onChange={(e) => setAiSettings(prev => ({ ...prev, provider: e.target.value }))} className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="local">Modelo Local</option>
              </select>
              <input type="password" value={aiSettings.apiKey} onChange={(e) => setAiSettings(prev => ({ ...prev, apiKey: e.target.value }))} placeholder="API Key" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
            </div>
          </div>

          <button onClick={saveAiSettings} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition">
            Salvar Configurações de IA
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;
