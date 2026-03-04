import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Pencil, Trash2, Play, Plus, X, Check } from 'lucide-react';

function MassCommands({ user }) {
  const [scripts, setScripts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [selectedScript, setSelectedScript] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [filterVendor, setFilterVendor] = useState('all');
  const [filterOnline, setFilterOnline] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [editingScript, setEditingScript] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', vendor: 'all', commands: '', timeout: 30 });
  const [editFormData, setEditFormData] = useState({ name: '', description: '', vendor: 'all', commands: '', timeout: 30 });

  useEffect(() => {
    loadScripts();
    loadDevices();
    loadExecutions();
  }, []);

  const loadScripts = async () => {
    try {
      const response = await fetch('/api/devices/api/mass-scripts/', { credentials: 'include' });
      const data = await response.json();
      setScripts(data.scripts || []);
    } catch (err) {
      console.error('Erro ao carregar scripts:', err);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await fetch('/api/devices/api/mass-devices/', { credentials: 'include' });
      const data = await response.json();
      setDevices(data.devices || []);
      setVendors(data.vendors || []);
    } catch (err) {
      console.error('Erro ao carregar devices:', err);
    }
  };

  const loadExecutions = async () => {
    try {
      const response = await fetch('/api/devices/api/mass-executions/', { credentials: 'include' });
      const data = await response.json();
      setExecutions(data.executions || []);
    } catch (err) {
      console.error('Erro ao carregar execucoes:', err);
    }
  };

  const filteredDevices = devices.filter(d => {
    if (filterVendor !== 'all' && d.vendor !== filterVendor) return false;
    if (filterOnline && !d.is_online) return false;
    return true;
  });

  // ========== CRIAR SCRIPT ==========
  const handleCreateScript = async () => {
    if (!formData.name.trim()) {
      alert('Nome do script e obrigatorio');
      return;
    }
    if (!formData.commands.trim()) {
      alert('Comandos sao obrigatorios');
      return;
    }
    try {
      const response = await fetch('/api/devices/api/mass-scripts/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormData({ name: '', description: '', vendor: 'all', commands: '', timeout: 30 });
        loadScripts();
      } else {
        alert(data.error || 'Erro ao criar script');
      }
    } catch (err) {
      alert('Erro de conexao');
    }
  };

  // ========== EDITAR SCRIPT ==========
  const openEditModal = (script) => {
    setEditingScript(script);
    setEditFormData({
      name: script.name,
      description: script.description || '',
      vendor: script.vendor,
      commands: script.commands,
      timeout: script.timeout
    });
    setShowEditModal(true);
  };

  const handleEditScript = async () => {
    if (!editFormData.name.trim()) {
      alert('Nome do script e obrigatorio');
      return;
    }
    if (!editFormData.commands.trim()) {
      alert('Comandos sao obrigatorios');
      return;
    }
    try {
      const response = await fetch('/api/devices/api/mass-scripts/' + editingScript.id + '/update/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editFormData),
      });
      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingScript(null);
        loadScripts();
      } else {
        alert(data.error || 'Erro ao atualizar script');
      }
    } catch (err) {
      alert('Erro de conexao');
    }
  };

  // ========== EXCLUIR SCRIPT ==========
  const handleDeleteScript = async (scriptId) => {
    if (!confirm('Tem certeza que deseja excluir este script?')) return;
    try {
      const response = await fetch('/api/devices/api/mass-scripts/' + scriptId + '/delete/', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        loadScripts();
      }
    } catch (err) {
      alert('Erro ao excluir');
    }
  };

  // ========== EXECUTAR SCRIPT ==========
  const handleExecute = async () => {
    if (selectedDevices.length === 0) {
      alert('Selecione pelo menos um equipamento');
      return;
    }
    try {
      const response = await fetch('/api/devices/api/mass-scripts/' + selectedScript.id + '/execute/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ device_ids: selectedDevices }),
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setShowExecuteModal(false);
        setSelectedDevices([]);
        loadExecutions();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Erro ao executar');
    }
  };

  const handleViewResults = async (executionId) => {
    try {
      const response = await fetch('/api/devices/api/mass-executions/' + executionId + '/', { credentials: 'include' });
      const data = await response.json();
      setSelectedExecution(data);
      setShowResultsModal(true);
    } catch (err) {
      alert('Erro ao carregar resultados');
    }
  };

  const toggleDevice = (deviceId) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const selectAllDevices = () => {
    setSelectedDevices(filteredDevices.map(d => d.id));
  };

  const clearSelection = () => {
    setSelectedDevices([]);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      running: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      partial: 'bg-orange-500/20 text-orange-400',
      failed: 'bg-red-500/20 text-red-400',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      running: 'Executando',
      completed: 'Concluido',
      partial: 'Parcial',
      failed: 'Falhou',
    };
    return labels[status] || status;
  };

  const isAdmin = user && (user.role === 'ADMIN');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Comandos em Massa</h2>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Script
          </Button>
        )}
      </div>

      {/* Scripts */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Scripts</h3>
        {scripts.length === 0 ? (
          <p className="text-zinc-400">Nenhum script cadastrado</p>
        ) : (
          <div className="space-y-2">
            {scripts.map(script => (
              <div key={script.id} className="bg-zinc-800 rounded-lg p-4 flex justify-between items-center">
                <div className="flex-1">
                  <h4 className="text-white font-medium">{script.name}</h4>
                  <p className="text-zinc-400 text-sm">{script.description || 'Sem descricao'}</p>
                  <p className="text-zinc-500 text-xs mt-1">Vendor: {script.vendor} | Timeout: {script.timeout}s</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => { setSelectedScript(script); setShowExecuteModal(true); }} 
                    className="bg-green-600 hover:bg-green-700 text-sm"
                  >
                    <Play className="w-4 h-4 mr-1" /> Executar
                  </Button>
                  {isAdmin && (
                    <>
                      <Button 
                        onClick={() => openEditModal(script)} 
                        className="bg-yellow-600 hover:bg-yellow-700 text-sm"
                      >
                        <Pencil className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button 
                        onClick={() => handleDeleteScript(script.id)} 
                        className="bg-red-600 hover:bg-red-700 text-sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Excluir
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historico de Execucoes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Historico de Execucoes</h3>
        {executions.length === 0 ? (
          <p className="text-zinc-400">Nenhuma execucao realizada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-zinc-400 text-left border-b border-zinc-700">
                  <th className="pb-2">Script</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Sucesso/Falha</th>
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Usuario</th>
                  <th className="pb-2">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(exec => (
                  <tr key={exec.id} className="border-b border-zinc-800">
                    <td className="py-3 text-white">{exec.script_name}</td>
                    <td className="py-3">
                      <span className={'px-2 py-1 rounded text-xs ' + getStatusColor(exec.status)}>
                        {getStatusLabel(exec.status)}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-300">{exec.success_count}/{exec.failed_count}</td>
                    <td className="py-3 text-zinc-400 text-sm">
                      {exec.created_at ? new Date(exec.created_at).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="py-3 text-zinc-400">{exec.triggered_by}</td>
                    <td className="py-3">
                      <Button onClick={() => handleViewResults(exec.id)} className="bg-zinc-700 hover:bg-zinc-600 text-sm">
                        Ver Resultados
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar Script */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Novo Script</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-zinc-400 text-sm">Nome *</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white mt-1 focus:border-blue-500 focus:outline-none" 
                  placeholder="Ex: Backup de configuracoes"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Descricao</label>
                <input 
                  type="text" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white mt-1 focus:border-blue-500 focus:outline-none" 
                  placeholder="Ex: Salva configuracao atual do equipamento"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Vendor Alvo</label>
                <select 
                  value={formData.vendor} 
                  onChange={e => setFormData({...formData, vendor: e.target.value})} 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white mt-1 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="Mikrotik">Mikrotik</option>
                  <option value="Huawei">Huawei</option>
                  <option value="Juniper">Juniper</option>
                  <option value="FiberHome">FiberHome OLT</option>
                  <option value="Linux">Linux</option>
                  <option value="Windows">Windows</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Comandos * (um por linha)</label>
                <textarea 
                  value={formData.commands} 
                  onChange={e => setFormData({...formData, commands: e.target.value})} 
                  rows={8} 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white mt-1 font-mono text-sm focus:border-blue-500 focus:outline-none" 
                  placeholder={"display version\ndisplay interface brief\nsave"}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Timeout (segundos)</label>
                <input 
                  type="number" 
                  value={formData.timeout} 
                  onChange={e => setFormData({...formData, timeout: parseInt(e.target.value) || 30})} 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white mt-1 focus:border-blue-500 focus:outline-none" 
                  min="5"
                  max="300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setShowCreateModal(false)} className="bg-zinc-700 hover:bg-zinc-600">Cancelar</Button>
              <Button onClick={handleCreateScript} className="bg-blue-600 hover:bg-blue-700">
                <Check className="w-4 h-4 mr-1" /> Criar Script
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Script */}
      {showEditModal && editingScript && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Editar Script</h3>
              <button onClick={() => { setShowEditModal(false); setEditingScript(null); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-zinc-400 text-sm">Nome *</label>
                <input 
                  type="text" 
                  value={editFormData.name} 
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white mt-1 focus:border-blue-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Descricao</label>
                <input 
                  type="text" 
                  value={editFormData.description} 
                  onChange={e => setEditFormData({...editFormData, description: e.target.value})} 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white mt-1 focus:border-blue-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Vendor Alvo</label>
                <select 
                  value={editFormData.vendor} 
                  onChange={e => setEditFormData({...editFormData, vendor: e.target.value})} 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white mt-1 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="Mikrotik">Mikrotik</option>
                  <option value="Huawei">Huawei</option>
                  <option value="Juniper">Juniper</option>
                  <option value="FiberHome">FiberHome OLT</option>
                  <option value="Linux">Linux</option>
                  <option value="Windows">Windows</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Comandos * (um por linha)</label>
                <textarea 
                  value={editFormData.commands} 
                  onChange={e => setEditFormData({...editFormData, commands: e.target.value})} 
                  rows={8} 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white mt-1 font-mono text-sm focus:border-blue-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Timeout (segundos)</label>
                <input 
                  type="number" 
                  value={editFormData.timeout} 
                  onChange={e => setEditFormData({...editFormData, timeout: parseInt(e.target.value) || 30})} 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white mt-1 focus:border-blue-500 focus:outline-none" 
                  min="5"
                  max="300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => { setShowEditModal(false); setEditingScript(null); }} className="bg-zinc-700 hover:bg-zinc-600">Cancelar</Button>
              <Button onClick={handleEditScript} className="bg-yellow-600 hover:bg-yellow-700">
                <Check className="w-4 h-4 mr-1" /> Salvar Alteracoes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Executar */}
      {showExecuteModal && selectedScript && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Executar: {selectedScript.name}</h3>
                <p className="text-zinc-400 text-sm">Selecione os equipamentos</p>
              </div>
              <button onClick={() => { setShowExecuteModal(false); setSelectedDevices([]); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Preview dos comandos */}
            <div className="bg-zinc-800 rounded-lg p-3 mb-4">
              <p className="text-zinc-400 text-xs mb-2">Comandos que serao executados:</p>
              <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">{selectedScript.commands}</pre>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <select 
                value={filterVendor} 
                onChange={e => setFilterVendor(e.target.value)} 
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Todos Vendors</option>
                {vendors.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={filterOnline} 
                  onChange={e => setFilterOnline(e.target.checked)} 
                  className="rounded bg-zinc-800 border-zinc-700" 
                />
                Apenas online
              </label>
              <Button onClick={selectAllDevices} className="bg-zinc-700 hover:bg-zinc-600 text-sm">Selecionar Todos</Button>
              <Button onClick={clearSelection} className="bg-zinc-700 hover:bg-zinc-600 text-sm">Limpar Selecao</Button>
            </div>

            <p className="text-blue-400 text-sm mb-2 font-medium">
              {selectedDevices.length} equipamento(s) selecionado(s)
            </p>

            <div className="bg-zinc-800 rounded-lg max-h-60 overflow-auto">
              {filteredDevices.length === 0 ? (
                <p className="text-zinc-500 p-4 text-center">Nenhum equipamento encontrado</p>
              ) : (
                filteredDevices.map(device => (
                  <label 
                    key={device.id} 
                    className="flex items-center gap-3 p-3 border-b border-zinc-700 hover:bg-zinc-700/50 cursor-pointer transition-colors"
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedDevices.includes(device.id)} 
                      onChange={() => toggleDevice(device.id)} 
                      className="rounded bg-zinc-800 border-zinc-700" 
                    />
                    <span className={'w-2 h-2 rounded-full ' + (device.is_online ? 'bg-green-500' : 'bg-red-500')}></span>
                    <span className="text-white flex-1">{device.name}</span>
                    <span className="text-zinc-400 text-sm">{device.ip}</span>
                    <span className="text-zinc-500 text-xs px-2 py-1 bg-zinc-700 rounded">{device.vendor}</span>
                  </label>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => { setShowExecuteModal(false); setSelectedDevices([]); }} className="bg-zinc-700 hover:bg-zinc-600">Cancelar</Button>
              <Button 
                onClick={handleExecute} 
                className="bg-green-600 hover:bg-green-700"
                disabled={selectedDevices.length === 0}
              >
                <Play className="w-4 h-4 mr-1" /> Executar em {selectedDevices.length} equipamento(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resultados */}
      {showResultsModal && selectedExecution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-4xl max-h-[85vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Resultados: {selectedExecution.execution?.script_name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={'px-2 py-1 rounded text-xs ' + getStatusColor(selectedExecution.execution?.status)}>
                    {getStatusLabel(selectedExecution.execution?.status)}
                  </span>
                  <span className="text-zinc-400 text-sm">Por: {selectedExecution.execution?.triggered_by}</span>
                </div>
              </div>
              <button onClick={() => { setShowResultsModal(false); setSelectedExecution(null); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Comandos executados */}
            {selectedExecution.execution?.script_commands && (
              <div className="bg-zinc-800 rounded-lg p-3 mb-4">
                <p className="text-zinc-400 text-xs mb-2">Comandos:</p>
                <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">{selectedExecution.execution.script_commands}</pre>
              </div>
            )}
            
            <div className="space-y-3">
              {selectedExecution.results?.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">Sem resultados ainda</p>
              ) : (
                selectedExecution.results?.map(result => (
                  <div 
                    key={result.id} 
                    className={'bg-zinc-800 rounded-lg p-4 border-l-4 ' + (result.success ? 'border-green-500' : 'border-red-500')}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{result.device_name}</span>
                        <span className="text-zinc-500 text-xs">{result.device_ip}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-xs">{result.execution_time?.toFixed(2)}s</span>
                        <span className={'px-2 py-1 rounded text-xs ' + (result.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                          {result.success ? 'Sucesso' : 'Erro'}
                        </span>
                      </div>
                    </div>
                    {result.output && (
                      <pre className="bg-zinc-900 rounded p-3 text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-48 font-mono">{result.output}</pre>
                    )}
                    {result.error_message && (
                      <p className="text-red-400 text-sm mt-2 bg-red-500/10 p-2 rounded">{result.error_message}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={() => { setShowResultsModal(false); setSelectedExecution(null); }} className="bg-zinc-700 hover:bg-zinc-600">Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MassCommands;
