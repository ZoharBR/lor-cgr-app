import React, { useState, useEffect } from 'react';
import { auditApi } from '../lib/api';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await auditApi.list();
      setLogs(response || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (eventType) => {
    const colors = {
      'SSH_CONNECT': 'bg-green-600/20 text-green-400',
      'SSH_DISCONNECT': 'bg-yellow-600/20 text-yellow-400',
      'STATUS_CHANGE': 'bg-blue-600/20 text-blue-400',
      'BACKUP_SUCCESS': 'bg-purple-600/20 text-purple-400',
      'BACKUP_FAILED': 'bg-red-600/20 text-red-400',
      'DEVICE_CREATED': 'bg-cyan-600/20 text-cyan-400',
      'DEVICE_UPDATED': 'bg-orange-600/20 text-orange-400',
      'DEVICE_DELETED': 'bg-red-600/20 text-red-400',
    };
    return colors[eventType] || 'bg-gray-600/20 text-gray-400';
  };

  const getEventIcon = (eventType) => {
    const icons = {
      'SSH_CONNECT': '🔌',
      'SSH_DISCONNECT': '🔌',
      'STATUS_CHANGE': '📊',
      'BACKUP_SUCCESS': '💾',
      'BACKUP_FAILED': '❌',
      'DEVICE_CREATED': '➕',
      'DEVICE_UPDATED': '✏️',
      'DEVICE_DELETED': '🗑️',
    };
    return icons[eventType] || '📝';
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.event_type?.includes(filter.toUpperCase());
    const matchesSearch = !searchTerm || 
      log.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Logs de Auditoria</h2>
          <p className="text-gray-400 text-sm">{logs.length} eventos registrados</p>
        </div>
        <button onClick={loadLogs} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition">
          🔄 Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="🔍 Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-64 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">Todos os eventos</option>
          <option value="ssh">SSH</option>
          <option value="backup">Backup</option>
          <option value="status">Status</option>
          <option value="device">Dispositivos</option>
        </select>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <span className="text-6xl mb-4 block">📋</span>
          <h3 className="text-xl font-medium text-white mb-2">Nenhum log encontrado</h3>
          <p className="text-gray-400">Os eventos aparecerão aqui</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-700">
            {filteredLogs.map((log, index) => (
              <div key={log.id || index} className="p-4 hover:bg-gray-700/30 transition">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">{getEventIcon(log.event_type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEventColor(log.event_type)}`}>
                        {log.event_type}
                      </span>
                      <span className="text-white font-medium">{log.device_name}</span>
                    </div>
                    <p className="text-gray-300 text-sm">{log.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>🖥️ {log.device_ip}</span>
                      <span>🕐 {new Date(log.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
