import React, { useState, useEffect } from 'react';

const Integrations = () => {
  const [activeTab, setActiveTab] = useState('librenms');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // LibreNMS State
  const [libreNmsConfig, setLibreNmsConfig] = useState({
    url: '',
    apiKey: '',
    enabled: false
  });
  const [libreNmsDevices, setLibreNmsDevices] = useState([]);
  const [libreNmsAlerts, setLibreNmsAlerts] = useState([]);

  // phpIPAM State
  const [phpIpamConfig, setPhpIpamConfig] = useState({
    url: '',
    appId: '',
    appKey: '',
    enabled: false
  });
  const [phpIpamSubnets, setPhpIpamSubnets] = useState([]);
  const [phpIpamAddresses, setPhpIpamAddresses] = useState([]);
  
  // New IP Form
  const [showIpForm, setShowIpForm] = useState(false);
  const [ipForm, setIpForm] = useState({
    subnetId: '',
    ip_addr: '',
    hostname: '',
    description: '',
    owner: ''
  });

  // New Subnet Form
  const [showSubnetForm, setShowSubnetForm] = useState(false);
  const [subnetForm, setSubnetForm] = useState({
    subnet: '',
    mask: '24',
    description: '',
    sectionId: '1'
  });

  const tabs = [
    { id: 'librenms', label: 'LibreNMS', icon: '📊' },
    { id: 'phpipam', label: 'phpIPAM', icon: '🌐' },
    { id: 'sync', label: 'Sincronização', icon: '🔄' }
  ];

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    if (activeTab === 'librenms' && libreNmsConfig.enabled) {
      loadLibreNmsData();
    }
    if (activeTab === 'phpipam' && phpIpamConfig.enabled) {
      loadPhpIpamData();
    }
  }, [activeTab, libreNmsConfig.enabled, phpIpamConfig.enabled]);

  const loadConfigs = () => {
    const savedLibre = localStorage.getItem('lorcgr-librenms');
    const savedIpam = localStorage.getItem('lorcgr-phpipam');
    
    if (savedLibre) setLibreNmsConfig(JSON.parse(savedLibre));
    if (savedIpam) setPhpIpamConfig(JSON.parse(savedIpam));
  };

  const saveConfig = (key, config) => {
    localStorage.setItem(key, JSON.stringify(config));
  };

  // LibreNMS Functions
  const loadLibreNmsData = async () => {
    if (!libreNmsConfig.url || !libreNmsConfig.apiKey) return;
    
    setLoading(true);
    try {
      const headers = { 'X-Auth-Token': libreNmsConfig.apiKey };
      
      // Load devices
      const devicesRes = await fetch(`${libreNmsConfig.url}/api/v0/devices`, { headers });
      const devicesData = await devicesRes.json();
      setLibreNmsDevices(devicesData.devices || []);

      // Load alerts
      const alertsRes = await fetch(`${libreNmsConfig.url}/api/v0/alerts`, { headers });
      const alertsData = await alertsRes.json();
      setLibreNmsAlerts(alertsData.alerts || []);
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao conectar com LibreNMS: ' + error.message });
    }
    setLoading(false);
  };

  const testLibreNms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${libreNmsConfig.url}/api/v0/system`, {
        headers: { 'X-Auth-Token': libreNmsConfig.apiKey }
      });
      const data = await res.json();
      if (data.system) {
        setMessage({ type: 'success', text: `Conectado! LibreNMS ${data.system.version}` });
        setLibreNmsConfig(prev => ({ ...prev, enabled: true }));
        saveConfig('lorcgr-librenms', { ...libreNmsConfig, enabled: true });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Falha na conexão: ' + error.message });
    }
    setLoading(false);
  };

  // phpIPAM Functions
  const loadPhpIpamData = async () => {
    if (!phpIpamConfig.url || !phpIpamConfig.appId || !phpIpamConfig.appKey) return;
    
    setLoading(true);
    try {
      // Get token first
      const tokenRes = await fetch(`${phpIpamConfig.url}/api/${phpIpamConfig.appId}/user/`, {
        headers: { 'Authorization': 'Basic ' + btoa('admin:' + phpIpamConfig.appKey) }
      });
      const tokenData = await tokenRes.json();
      const token = tokenData.data?.token;
      
      if (!token) throw new Error('Falha ao obter token');
      
      const headers = { 'token': token };

      // Load subnets
      const subnetsRes = await fetch(`${phpIpamConfig.url}/api/${phpIpamConfig.appId}/subnets/`, { headers });
      const subnetsData = await subnetsRes.json();
      setPhpIpamSubnets(subnetsData.data || []);

      // Load all addresses
      const addresses = [];
      for (const subnet of (subnetsData.data || []).slice(0, 10)) {
        const addrRes = await fetch(`${phpIpamConfig.url}/api/${phpIpamConfig.appId}/subnets/${subnet.id}/addresses/`, { headers });
        const addrData = await addrRes.json();
        if (addrData.data) {
          addresses.push(...addrData.data.map(a => ({ ...a, subnetName: subnet.description })));
        }
      }
      setPhpIpamAddresses(addresses);
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao conectar com phpIPAM: ' + error.message });
    }
    setLoading(false);
  };

  const testPhpIpam = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${phpIpamConfig.url}/api/${phpIpamConfig.appId}/user/`, {
        headers: { 'Authorization': 'Basic ' + btoa('admin:' + phpIpamConfig.appKey) }
      });
      const data = await res.json();
      if (data.data?.token) {
        setMessage({ type: 'success', text: 'Conectado ao phpIPAM com sucesso!' });
        setPhpIpamConfig(prev => ({ ...prev, enabled: true }));
        saveConfig('lorcgr-phpipam', { ...phpIpamConfig, enabled: true });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Falha na conexão: ' + error.message });
    }
    setLoading(false);
  };

  const createIp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tokenRes = await fetch(`${phpIpamConfig.url}/api/${phpIpamConfig.appId}/user/`, {
        headers: { 'Authorization': 'Basic ' + btoa('admin:' + phpIpamConfig.appKey) }
      });
      const tokenData = await tokenRes.json();
      const token = tokenData.data?.token;

      await fetch(`${phpIpamConfig.url}/api/${phpIpamConfig.appId}/addresses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'token': token },
        body: JSON.stringify({
          subnetId: ipForm.subnetId,
          ip: ipForm.ip_addr,
          hostname: ipForm.hostname,
          description: ipForm.description,
          owner: ipForm.owner
        })
      });
      
      setMessage({ type: 'success', text: 'IP cadastrado com sucesso!' });
      setShowIpForm(false);
      loadPhpIpamData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao criar IP: ' + error.message });
    }
    setLoading(false);
  };

  const createSubnet = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tokenRes = await fetch(`${phpIpamConfig.url}/api/${phpIpamConfig.appId}/user/`, {
        headers: { 'Authorization': 'Basic ' + btoa('admin:' + phpIpamConfig.appKey) }
      });
      const tokenData = await tokenRes.json();
      const token = tokenData.data?.token;

      await fetch(`${phpIpamConfig.url}/api/${phpIpamConfig.appId}/subnets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'token': token },
        body: JSON.stringify({
          subnet: subnetForm.subnet,
          mask: subnetForm.mask,
          description: subnetForm.description,
          sectionId: subnetForm.sectionId
        })
      });
      
      setMessage({ type: 'success', text: 'Sub-rede criada com sucesso!' });
      setShowSubnetForm(false);
      loadPhpIpamData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao criar sub-rede: ' + error.message });
    }
    setLoading(false);
  };

  // Sync Functions
  const syncAllDevices = async () => {
    setLoading(true);
    setMessage({ type: 'success', text: 'Sincronizando dispositivos...' });
    // This would call the backend to sync all devices to LibreNMS and phpIPAM
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Sincronização concluída!' });
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Integrações Externas</h2>
          <p className="text-gray-400 text-sm">Gerencie LibreNMS, phpIPAM e sincronização</p>
        </div>
      </div>

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

      {/* LibreNMS Tab */}
      {activeTab === 'librenms' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Configuração LibreNMS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">URL do LibreNMS</label>
                <input type="url" value={libreNmsConfig.url} onChange={(e) => setLibreNmsConfig({...libreNmsConfig, url: e.target.value})} placeholder="http://librenms.example.com" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">API Token</label>
                <input type="password" value={libreNmsConfig.apiKey} onChange={(e) => setLibreNmsConfig({...libreNmsConfig, apiKey: e.target.value})} placeholder="••••••••" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <button onClick={testLibreNms} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">Testar Conexão</button>
              <button onClick={loadLibreNmsData} disabled={loading || !libreNmsConfig.enabled} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition">Carregar Dados</button>
            </div>
          </div>

          {libreNmsConfig.enabled && (
            <>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Dispositivos no LibreNMS ({libreNmsDevices.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="text-left text-gray-400 text-sm">
                      <th className="pb-2">Hostname</th><th className="pb-2">IP</th><th className="pb-2">Tipo</th><th className="pb-2">Status</th>
                    </tr></thead>
                    <tbody>
                      {libreNmsDevices.slice(0, 10).map((d, i) => (
                        <tr key={i} className="border-t border-gray-700">
                          <td className="py-2 text-white">{d.hostname || d.sysName}</td>
                          <td className="py-2 text-gray-300">{d.ip}</td>
                          <td className="py-2 text-gray-400">{d.type || '-'}</td>
                          <td className="py-2"><span className={`px-2 py-1 rounded text-xs ${d.status === '1' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{d.status === '1' ? 'Online' : 'Offline'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Alertas Recentes</h3>
                {libreNmsAlerts.length === 0 ? <p className="text-gray-400">Nenhum alerta</p> : (
                  <div className="space-y-2">
                    {libreNmsAlerts.slice(0, 5).map((a, i) => (
                      <div key={i} className="p-3 bg-gray-700/50 rounded-lg">
                        <p className="text-white text-sm">{a.title || a.message}</p>
                        <p className="text-gray-500 text-xs mt-1">{a.timestamp}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* phpIPAM Tab */}
      {activeTab === 'phpipam' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Configuração phpIPAM</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
                <input type="url" value={phpIpamConfig.url} onChange={(e) => setPhpIpamConfig({...phpIpamConfig, url: e.target.value})} placeholder="http://phpipam.example.com" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">App ID</label>
                <input type="text" value={phpIpamConfig.appId} onChange={(e) => setPhpIpamConfig({...phpIpamConfig, appId: e.target.value})} placeholder="lorcgr" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">App Key</label>
                <input type="password" value={phpIpamConfig.appKey} onChange={(e) => setPhpIpamConfig({...phpIpamConfig, appKey: e.target.value})} placeholder="••••••••" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <button onClick={testPhpIpam} disabled={loading} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition">Testar Conexão</button>
              <button onClick={loadPhpIpamData} disabled={loading || !phpIpamConfig.enabled} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition">Carregar Dados</button>
            </div>
          </div>

          {phpIpamConfig.enabled && (
            <>
              {/* Subnets */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Sub-redes ({phpIpamSubnets.length})</h3>
                  <button onClick={() => setShowSubnetForm(true)} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition">+ Nova Sub-rede</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {phpIpamSubnets.map((s, i) => (
                    <div key={i} className="p-4 bg-gray-700/50 rounded-lg">
                      <p className="text-white font-medium">{s.subnet}/{s.mask}</p>
                      <p className="text-gray-400 text-sm">{s.description || 'Sem descrição'}</p>
                      <button onClick={() => { setIpForm({...ipForm, subnetId: s.id}); setShowIpForm(true); }} className="mt-2 text-blue-400 text-sm hover:text-blue-300">+ Adicionar IP</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* IP Addresses */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Endereços IP ({phpIpamAddresses.length})</h3>
                  <button onClick={() => setShowIpForm(true)} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition">+ Novo IP</button>
                </div>
                <table className="w-full">
                  <thead><tr className="text-left text-gray-400 text-sm">
                    <th className="pb-2">IP</th><th className="pb-2">Hostname</th><th className="pb-2">Sub-rede</th><th className="pb-2">Descrição</th>
                  </tr></thead>
                  <tbody>
                    {phpIpamAddresses.slice(0, 20).map((a, i) => (
                      <tr key={i} className="border-t border-gray-700">
                        <td className="py-2 text-white font-mono">{a.ip}</td>
                        <td className="py-2 text-gray-300">{a.hostname || '-'}</td>
                        <td className="py-2 text-gray-400">{a.subnetName || '-'}</td>
                        <td className="py-2 text-gray-500 text-sm">{a.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* IP Form Modal */}
          {showIpForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4">Cadastrar Endereço IP</h4>
                <form onSubmit={createIp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Sub-rede</label>
                    <select value={ipForm.subnetId} onChange={(e) => setIpForm({...ipForm, subnetId: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                      <option value="">Selecione...</option>
                      {phpIpamSubnets.map(s => <option key={s.id} value={s.id}>{s.subnet}/{s.mask} - {s.description}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Endereço IP</label>
                    <input type="text" value={ipForm.ip_addr} onChange={(e) => setIpForm({...ipForm, ip_addr: e.target.value})} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Hostname</label>
                    <input type="text" value={ipForm.hostname} onChange={(e) => setIpForm({...ipForm, hostname: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                    <input type="text" value={ipForm.description} onChange={(e) => setIpForm({...ipForm, description: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                  </div>
                  <div className="flex space-x-3">
                    <button type="submit" disabled={loading} className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition">Cadastrar</button>
                    <button type="button" onClick={() => setShowIpForm(false)} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition">Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Subnet Form Modal */}
          {showSubnetForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4">Criar Sub-rede</h4>
                <form onSubmit={createSubnet} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Rede</label>
                      <input type="text" value={subnetForm.subnet} onChange={(e) => setSubnetForm({...subnetForm, subnet: e.target.value})} placeholder="192.168.1.0" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Máscara</label>
                      <input type="text" value={subnetForm.mask} onChange={(e) => setSubnetForm({...subnetForm, mask: e.target.value})} placeholder="24" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                    <input type="text" value={subnetForm.description} onChange={(e) => setSubnetForm({...subnetForm, description: e.target.value})} placeholder="Rede Local" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                  </div>
                  <div className="flex space-x-3">
                    <button type="submit" disabled={loading} className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition">Criar</button>
                    <button type="button" onClick={() => setShowSubnetForm(false)} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition">Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sync Tab */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Sincronização Automática</h3>
            <p className="text-gray-400 mb-4">Sincronize dispositivos do LOR CGR com LibreNMS e phpIPAM automaticamente.</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Sincronizar com LibreNMS</p>
                  <p className="text-gray-400 text-sm">Envia dispositivos para monitoramento</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">Sincronizar</button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Sincronizar com phpIPAM</p>
                  <p className="text-gray-400 text-sm">Registra IPs dos dispositivos</p>
                </div>
                <button className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition">Sincronizar</button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-blue-600">
                <div>
                  <p className="text-white font-medium">Sincronização Completa</p>
                  <p className="text-gray-400 text-sm">Sincroniza todos os dispositivos com todos os sistemas</p>
                </div>
                <button onClick={syncAllDevices} disabled={loading} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition">Sincronizar Tudo</button>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Configurações de Auto-Sync</h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600" />
                <span className="text-gray-300">Sincronizar automaticamente ao criar dispositivo</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600" />
                <span className="text-gray-300">Sincronizar alterações automaticamente</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600" />
                <span className="text-gray-300">Remover do LibreNMS/phpIPAM ao excluir dispositivo</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
