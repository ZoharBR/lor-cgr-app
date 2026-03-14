import React, { useState, useEffect } from 'react';
import DeviceInterfaces from './DeviceInterfaces';
import { devicesApi } from '../lib/api';

const Inventory = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showInterfaces, setShowInterfaces] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const [formData, setFormData] = useState({
    hostname: '',
    ip_address: '',
    vendor: 'Huawei',
    device_type: 'Router',
    model: '',
    os_version: '',
    serial_number: '',
    username: '',
    password: '',
    port: 22,
    protocol: 'SSH',
    web_url: '',
    librenms_id: '',
    snmp_community: 'public',
    snmp_port: 161,
    snmp_version: 'v2c',
    is_bras: false,
    backup_enabled: true,
    backup_frequency: 'daily',
    backup_time: '03:00'
  });

  const vendors = ['Huawei', 'Mikrotik', 'FiberHome', 'Juniper', 'Cisco', 'TP-Link', 'Ubiquiti', 'Fortinet', 'HP/Aruba', 'Dell', 'Linux', 'Windows', 'Outro'];

  const typesByVendor = {
    'Huawei': ['OLT', 'Switch', 'Router', 'Concentrador', 'CGNAT'],
    'Mikrotik': ['Switch', 'Router', 'Concentrador', 'CGNAT', 'Wireless'],
    'FiberHome': ['OLT', 'ONU', 'ONT'],
    'Juniper': ['Router', 'Concentrador', 'Switch'],
    'Cisco': ['Switch', 'Router', 'Concentrador'],
    'TP-Link': ['OLT', 'Router', 'Switch', 'ONU', 'ONT'],
    'Ubiquiti': ['Wireless', 'Switch', 'Router'],
    'Fortinet': ['Router', 'CGNAT'],
    'HP/Aruba': ['Switch', 'Router'],
    'Dell': ['Switch'],
    'Linux': ['Server', 'Router', 'Concentrador'],
    'Windows': ['Server'],
    'Outro': ['Outro'],
  };

  useEffect(() => { loadDevices(); }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const response = await devicesApi.list();
      setDevices(response || []);
    } catch (error) {
      console.error('Error loading devices:', error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (editingDevice) data.id = editingDevice.id;
      await devicesApi.save(data);
      setMessage({ type: 'success', text: 'Dispositivo salvo com sucesso!' });
      loadDevices();
      resetForm();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar dispositivo' });
    }
  };

  const handleEdit = (device) => {
    setFormData({
      hostname: device.hostname || '',
      ip_address: device.ip_address || '',
      vendor: device.vendor || 'Huawei',
      device_type: device.device_type || 'Router',
      model: device.model || '',
      os_version: device.os_version || '',
      serial_number: device.serial_number || '',
      username: device.username || '',
      password: '',
      port: device.port || 22,
      protocol: device.protocol || 'SSH',
      web_url: device.web_url || '',
      librenms_id: device.librenms_id || '',
      snmp_community: device.snmp_community || 'public',
      snmp_port: device.snmp_port || 161,
      snmp_version: device.snmp_version || 'v2c',
      is_bras: device.is_bras || false,
      backup_enabled: device.backup_enabled !== false,
      backup_frequency: device.backup_frequency || 'daily',
      backup_time: device.backup_time || '03:00'
    });
    setEditingDevice(device);
    setShowForm(true);
    setActiveTab('basic');
  };

  const handleDelete = async (device) => {
    if (!window.confirm('Excluir dispositivo "' + device.hostname + '"?')) return;
    try {
      await devicesApi.delete(device.id);
      setMessage({ type: 'success', text: 'Dispositivo excluido!' });
      loadDevices();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao excluir' });
    }
  };

  const resetForm = () => {
    setFormData({
      hostname: '', ip_address: '', vendor: 'Huawei', device_type: 'Router',
      model: '', os_version: '', serial_number: '', username: '', password: '',
      port: 22, protocol: 'SSH', web_url: '', librenms_id: '',
      snmp_community: 'public', snmp_port: 161, snmp_version: 'v2c',
      is_bras: false, backup_enabled: true, backup_frequency: 'daily', backup_time: '03:00'
    });
    setEditingDevice(null);
    setShowForm(false);
    setActiveTab('basic');
  };

  const handleSyncLibreNMS = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/devices/librenms/sync/', { method: 'POST' });
      const data = await response.json();
      if (data.status === 'success') {
        setMessage({ type: 'success', text: 'Sincronizado! ' + data.created + ' novos, ' + data.updated + ' atualizados' });
        loadDevices();
      } else {
        setMessage({ type: 'error', text: data.message || 'Erro na sincronizacao' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao sincronizar com LibreNMS' });
    } finally {
      setSyncing(false);
      setShowSyncModal(false);
    }
  };

  const handleICMPCheck = async () => {
    try {
      const response = await fetch('/api/devices/icmp/check/', { method: 'POST' });
      const data = await response.json();
      if (data.status === 'success') {
        setMessage({ type: 'success', text: 'Verificacao ICMP concluida!' });
        loadDevices();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro na verificacao ICMP' });
    }
  };

  const getStatusColor = (device) => {
    const status = device.icmp_status || 'unknown';
    if (status === 'online') return 'bg-green-500';
    if (status === 'warning') return 'bg-orange-500';
    if (status === 'offline') return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getStatusText = (device) => {
    const status = device.icmp_status || 'unknown';
    const latency = device.icmp_latency || 0;
    if (status === 'online') return latency.toFixed(1) + 'ms';
    if (status === 'warning') return latency.toFixed(1) + 'ms (alto)';
    if (status === 'offline') return 'Offline';
    return 'N/A';
  };

  const getTypeLabel = (type) => {
    const labels = {
      'OLT': 'OLT', 'Switch': 'Switch', 'Router': 'Router',
      'Concentrador': 'BNG/BRAS', 'CGNAT': 'CGNAT',
      'ONU': 'ONU', 'ONT': 'ONT', 'Wireless': 'Wireless',
      'Server': 'Server', 'Outro': 'Outro'
    };
    return labels[type] || type;
  };

  const filteredDevices = devices.filter(device => {
    const name = device.hostname || '';
    const ip = device.ip_address || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || ip.includes(searchTerm);
    const matchesVendor = filterVendor === 'all' || device.vendor === filterVendor;
    const matchesType = filterType === 'all' || device.device_type === filterType;
    const matchesStatus = filterStatus === 'all' || device.icmp_status === filterStatus;
    return matchesSearch && matchesVendor && matchesType && matchesStatus;
  });

  const availableTypes = typesByVendor[formData.vendor] || ['Outro'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={'p-4 rounded-lg ' + (message.type === 'success' ? 'bg-green-600/20 text-green-400 border border-green-600' : 'bg-red-600/20 text-red-400 border border-red-600')}>
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Inventario de Dispositivos</h2>
          <p className="text-gray-400 text-sm">{devices.length} dispositivos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleICMPCheck} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition text-sm">Verificar Status</button>
          <button onClick={() => setShowSyncModal(true)} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition text-sm">Sincronizar LibreNMS</button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex items-center space-x-2">
            <span>+</span><span>Novo Dispositivo</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <input type="text" placeholder="Buscar por nome ou IP..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-64 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
          <option value="all">Todos Fabricantes</option>
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
          <option value="all">Todos Tipos</option>
          <option value="OLT">OLT</option>
          <option value="Switch">Switch</option>
          <option value="Router">Router</option>
          <option value="Concentrador">BNG/BRAS</option>
          <option value="CGNAT">CGNAT</option>
          <option value="Wireless">Wireless</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
          <option value="all">Todos Status</option>
          <option value="online">Online</option>
          <option value="warning">Warning</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">{editingDevice ? 'Editar Dispositivo' : 'Novo Dispositivo'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white text-xl">x</button>
          </div>
          <div className="flex border-b border-gray-700">
            {['basic', 'access', 'snmp', 'backup'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={'px-6 py-3 text-sm font-medium transition ' + (activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white')}>
                {tab === 'basic' ? 'Basico' : tab === 'access' ? 'Acesso' : tab === 'snmp' ? 'SNMP' : 'Backup'}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Hostname *</label>
                  <input type="text" value={formData.hostname} onChange={(e) => setFormData({...formData, hostname: e.target.value})} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Endereco IP *</label>
                  <input type="text" value={formData.ip_address} onChange={(e) => setFormData({...formData, ip_address: e.target.value})} required placeholder="192.168.1.1" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fabricante</label>
                  <select value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value, device_type: typesByVendor[e.target.value]?.[0] || 'Outro'})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                    {vendors.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Equipamento</label>
                  <select value={formData.device_type} onChange={(e) => setFormData({...formData, device_type: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                    {availableTypes.map(t => <option key={t} value={t}>{getTypeLabel(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Modelo</label>
                  <input type="text" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Versao SO</label>
                  <input type="text" value={formData.os_version} onChange={(e) => setFormData({...formData, os_version: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Numero de Serie</label>
                  <input type="text" value={formData.serial_number} onChange={(e) => setFormData({...formData, serial_number: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">LibreNMS ID</label>
                  <input type="number" value={formData.librenms_id} onChange={(e) => setFormData({...formData, librenms_id: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={formData.is_bras} onChange={(e) => setFormData({...formData, is_bras: e.target.checked})} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600" />
                    <span className="text-gray-300">e BRAS/PPPoE Server</span>
                  </label>
                </div>
              </div>
            )}
            {activeTab === 'access' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Usuario SSH</label>
                  <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Senha SSH</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Porta SSH/Telnet</label>
                  <input type="number" value={formData.port} onChange={(e) => setFormData({...formData, port: parseInt(e.target.value) || 22})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Protocolo</label>
                  <select value={formData.protocol} onChange={(e) => setFormData({...formData, protocol: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                    <option value="SSH">SSH</option>
                    <option value="Telnet">Telnet</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">URL Web (Proxy)</label>
                  <input type="text" value={formData.web_url} onChange={(e) => setFormData({...formData, web_url: e.target.value})} placeholder="https://192.168.1.1:443/" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
              </div>
            )}
            {activeTab === 'snmp' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Versao SNMP</label>
                  <select value={formData.snmp_version} onChange={(e) => setFormData({...formData, snmp_version: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                    <option value="v1">v1</option>
                    <option value="v2c">v2c</option>
                    <option value="v3">v3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Porta SNMP</label>
                  <input type="number" value={formData.snmp_port} onChange={(e) => setFormData({...formData, snmp_port: parseInt(e.target.value) || 161})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Community String</label>
                  <input type="text" value={formData.snmp_community} onChange={(e) => setFormData({...formData, snmp_community: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
              </div>
            )}
            {activeTab === 'backup' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={formData.backup_enabled} onChange={(e) => setFormData({...formData, backup_enabled: e.target.checked})} className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600" />
                    <span className="text-gray-300">Habilitar Backup Automatico</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Frequencia</label>
                  <select value={formData.backup_frequency} onChange={(e) => setFormData({...formData, backup_frequency: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                    <option value="hourly">A cada hora</option>
                    <option value="daily">Diariamente</option>
                    <option value="weekly">Semanalmente</option>
                    <option value="monthly">Mensalmente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Horario</label>
                  <input type="time" value={formData.backup_time} onChange={(e) => setFormData({...formData, backup_time: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-700">
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">{editingDevice ? 'Atualizar' : 'Cadastrar'}</button>
            </div>
          </form>
        </div>
      )}

      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Sincronizar com LibreNMS</h3>
            <p className="text-gray-400 mb-6">Isso ira importar/atualizar dispositivos do LibreNMS. Deseja continuar?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowSyncModal(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition">Cancelar</button>
              <button onClick={handleSyncLibreNMS} disabled={syncing} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition disabled:opacity-50">{syncing ? 'Sincronizando...' : 'Sincronizar'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Hostname</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">IP</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Fabricante</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Modelo</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredDevices.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum dispositivo encontrado</td></tr>
            ) : (
              filteredDevices.map(device => (
                <tr key={device.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={'w-3 h-3 rounded-full ' + getStatusColor(device)}></div>
                      <span className="text-xs text-gray-400">{getStatusText(device)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{device.hostname || '-'}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-sm">{device.ip_address || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">{device.vendor || 'N/A'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs">{getTypeLabel(device.device_type) || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{device.model || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setShowInterfaces(device)} className="text-purple-400 hover:text-purple-300 mr-3 text-sm">Interfaces</button>
                    <button onClick={() => handleEdit(device)} className="text-blue-400 hover:text-blue-300 mr-3 text-sm">Editar</button>
                    <button onClick={() => handleDelete(device)} className="text-red-400 hover:text-red-300 text-sm">Excluir</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showInterfaces && (
        <DeviceInterfaces device={showInterfaces} onClose={() => setShowInterfaces(null)} />
      )}
    </div>
  );
};

export default Inventory;
