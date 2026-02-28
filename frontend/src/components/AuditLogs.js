import React, { useState, useEffect } from 'react';
import { Eye, Download, Trash2, RefreshCw, Search, Terminal, User, ChevronLeft, ChevronRight, X, FileText, Copy, Check } from 'lucide-react';

const AuditLogs = ({ user: currentUser }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  const canDelete = currentUser?.role === 'ADMIN' || currentUser?.role === 'admin';

  useEffect(() => { loadLogs(); }, [page, filter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '30' });
      if (filter !== 'all') params.append('action', filter);
      if (searchTerm) params.append('action', searchTerm);
      
      const response = await fetch('/api/logs/?' + params, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setLogs(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (e) { console.error('Erro:', e); }
    finally { setLoading(false); }
  };

  const deleteLog = async (logId) => {
    if (!confirm('Tem certeza que deseja excluir este log?')) return;
    try {
      const res = await fetch('/api/logs/' + logId + '/delete/', { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { loadLogs(); setShowDetail(false); }
      else alert(data.error || 'Erro ao excluir');
    } catch (e) { alert('Erro: ' + e.message); }
  };

  const exportLog = (log, format) => {
    let content = '';
    let filename = '';
    const date = new Date(log.createdAt).toISOString().split('T')[0];
    
    if (format === 'txt') {
      content = `=== LOG DE AUDITORIA LOR CGR ===
ID: ${log.id}
Data/Hora: ${new Date(log.createdAt).toLocaleString('pt-BR')}
Usuario: ${log.user?.name || 'Sistema'} (${log.user?.role || 'NOC'})
Acao: ${log.action}
Descricao: ${log.description}
IP: ${log.ipAddress || 'N/A'}

`;
      if (log.sshDevice) {
        content += `=== DETALHES SSH ===
Dispositivo: ${log.sshDevice}
Sucesso: ${log.sshSuccess ? 'Sim' : 'Nao'}

`;
      }
      if (log.sshCommand) {
        content += `=== COMANDOS EXECUTADOS ===
 ${log.sshCommand}

`;
      }
      if (log.sshOutput) {
        content += `=== SAIDA DO TERMINAL ===
 ${log.sshOutput}
`;
      }
      filename = `log_${log.id}_${date}.txt`;
    } else {
      content = JSON.stringify(log, null, 2);
      filename = `log_${log.id}_${date}.json`;
    }
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEventColor = (action) => {
    if (action?.includes('SSH')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (action?.includes('USER')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (action?.includes('DEVICE')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (action?.includes('ERROR')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getRoleColor = (role) => {
    if (role === 'ADMIN') return 'bg-red-500/20 text-red-400';
    if (role === 'NOC') return 'bg-blue-500/20 text-blue-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  const openDetail = async (log) => {
    // Buscar detalhes completos
    try {
      const res = await fetch('/api/logs/' + log.id + '/', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSelectedLog(data.data);
        setShowDetail(true);
      }
    } catch (e) {
      setSelectedLog(log);
      setShowDetail(true);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-400" />
              Logs de Auditoria
            </h2>
            <p className="text-gray-400 text-sm">{total} eventos registrados</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadLogs} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-gray-300">
              <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} /> Atualizar
            </button>
            <button onClick={() => window.open('/api/logs/export/?format=csv', '_blank')} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-gray-300">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
        </div>
        
        {/* Filtros */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          >
            <option value="all">Todos</option>
            <option value="SSH">SSH</option>
            <option value="USER">Usuarios</option>
            <option value="DEVICE">Dispositivos</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Nenhum log encontrado</div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Data/Hora</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Usuario</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Acao</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Descricao</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">IP</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-300">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="border-t border-gray-700 hover:bg-gray-700/30 cursor-pointer"
                    onClick={() => openDetail(log)}
                  >
                    <td className="py-3 px-4 text-xs text-gray-400 font-mono">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center">
                          <User className="w-3 h-3 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-white text-sm">{log.user?.name || 'Sistema'}</div>
                          <span className={'text-xs px-1.5 py-0.5 rounded ' + getRoleColor(log.user?.role)}>
                            {log.user?.role || 'NOC'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={'px-2 py-1 rounded text-xs font-mono border ' + getEventColor(log.action)}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300 max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 font-mono">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openDetail(log)} className="p-1.5 hover:bg-gray-600 rounded" title="Ver detalhes">
                          <Eye className="w-4 h-4 text-blue-400" />
                        </button>
                        <button onClick={() => exportLog(log, 'txt')} className="p-1.5 hover:bg-gray-600 rounded" title="Baixar TXT">
                          <Download className="w-4 h-4 text-green-400" />
                        </button>
                        {canDelete && (
                          <button onClick={() => deleteLog(log.id)} className="p-1.5 hover:bg-red-500/20 rounded" title="Excluir">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginacao */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">Pagina {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 text-gray-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 text-gray-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {showDetail && selectedLog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-700/50 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedLog.action?.includes('SSH') ? (
                  <Terminal className="w-6 h-6 text-yellow-400" />
                ) : (
                  <FileText className="w-6 h-6 text-blue-400" />
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">Detalhes do Log #{selectedLog.id}</h3>
                  <p className="text-sm text-gray-400">{new Date(selectedLog.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => exportLog(selectedLog, 'txt')} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 rounded hover:bg-green-500 text-white text-sm">
                  <Download className="w-4 h-4" /> Baixar TXT
                </button>
                {canDelete && (
                  <button onClick={() => deleteLog(selectedLog.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 rounded hover:bg-red-500 text-white text-sm">
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                )}
                <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-600 rounded text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteudo */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {/* Info basica */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 p-3 rounded">
                  <label className="text-xs text-gray-500 block mb-1">Usuario</label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="text-white">{selectedLog.user?.name || 'Sistema'}</span>
                  </div>
                  <span className={'text-xs px-2 py-0.5 rounded mt-1 inline-block ' + getRoleColor(selectedLog.user?.role)}>
                    {selectedLog.user?.role || 'NOC'}
                  </span>
                </div>
                <div className="bg-gray-900 p-3 rounded">
                  <label className="text-xs text-gray-500 block mb-1">Acao</label>
                  <span className={'px-2 py-1 rounded text-sm font-mono border ' + getEventColor(selectedLog.action)}>
                    {selectedLog.action}
                  </span>
                </div>
                <div className="bg-gray-900 p-3 rounded">
                  <label className="text-xs text-gray-500 block mb-1">IP</label>
                  <span className="text-white font-mono">{selectedLog.ipAddress || 'N/A'}</span>
                </div>
                <div className="bg-gray-900 p-3 rounded">
                  <label className="text-xs text-gray-500 block mb-1">Status</label>
                  {selectedLog.sshSuccess !== undefined ? (
                    <span className={selectedLog.sshSuccess ? 'text-green-400' : 'text-red-400'}>
                      {selectedLog.sshSuccess ? 'Sucesso' : 'Falhou'}
                    </span>
                  ) : '-'}
                </div>
              </div>

              {/* Descricao */}
              <div className="bg-gray-900 p-3 rounded">
                <label className="text-xs text-gray-500 block mb-1">Descricao</label>
                <p className="text-white">{selectedLog.description}</p>
              </div>

              {/* Detalhes SSH */}
              {selectedLog.action?.includes('SSH') && (
                <div className="border border-yellow-500/30 rounded-lg overflow-hidden">
                  <div className="bg-yellow-500/10 px-4 py-2 border-b border-yellow-500/30 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 font-medium">Sessao SSH</span>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    {/* Dispositivo */}
                    {selectedLog.sshDevice && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Dispositivo</label>
                        <p className="bg-gray-950 p-2 rounded text-sm font-mono text-white">{selectedLog.sshDevice}</p>
                      </div>
                    )}

                    {/* Comandos */}
                    {selectedLog.sshCommand && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500">Comandos Executados</label>
                          <button 
                            onClick={() => copyToClipboard(selectedLog.sshCommand)}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                          >
                            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <pre className="bg-gray-950 p-3 rounded text-sm font-mono text-green-400 overflow-x-auto whitespace-pre-wrap max-h-40">
                          {selectedLog.sshCommand}
                        </pre>
                      </div>
                    )}

                    {/* Output do Terminal */}
                    {selectedLog.sshOutput && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500">Saida do Terminal ({selectedLog.sshOutput.length} caracteres)</label>
                          <button 
                            onClick={() => copyToClipboard(selectedLog.sshOutput)}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                          >
                            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <pre className="bg-gray-950 p-3 rounded text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-96">
                          {selectedLog.sshOutput}
                        </pre>
                      </div>
                    )}

                    {/* Sem dados */}
                    {!selectedLog.sshCommand && !selectedLog.sshOutput && (
                      <div className="text-center py-4 text-gray-500">
                        Sem dados de terminal registrados
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-700/50 px-6 py-3 border-t border-gray-700 flex justify-end gap-2">
              <button onClick={() => setShowDetail(false)} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 text-white">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
