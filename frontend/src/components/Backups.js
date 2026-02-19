import React, { useState, useEffect } from 'react';
import { backupsApi, devicesApi } from '../lib/api';

const Backups = () => {
  const [backupsData, setBackupsData] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupContent, setBackupContent] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [backupsRes, devicesRes] = await Promise.all([backupsApi.list(), devicesApi.list()]);
      setBackupsData(backupsRes || []);
      setDevices(devicesRes || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  };

  const runBackup = async (deviceId) => {
    setMessage({ type: 'success', text: 'Iniciando backup...' });
    try {
      await backupsApi.run(deviceId);
      setMessage({ type: 'success', text: 'Backup iniciado!' });
      setTimeout(loadData, 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao iniciar backup' });
    }
  };

  const viewBackup = async (backup) => {
    try {
      const content = await backupsApi.view(backup.path);
      setSelectedBackup(backup);
      setBackupContent(content.content || 'Conteudo nao disponivel');
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao carregar backup' });
    }
  };

  const deleteBackup = async (backup, deviceName) => {
    if (!window.confirm(`Excluir backup "${backup.name}"?`)) return;
    
    try {
      await backupsApi.delete(backup.path);
      setMessage({ type: 'success', text: 'Backup excluido!' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao excluir backup' });
    }
  };

  const totalBackups = backupsData.reduce((sum, d) => sum + (d.backups?.length || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;
  }

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-600/20 text-green-400 border border-green-600' : 'bg-red-600/20 text-red-400 border border-red-600'}`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Backups</h2>
          <p className="text-gray-400 text-sm">{totalBackups} backups de {backupsData.length} dispositivos</p>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">Atualizar</button>
      </div>

      {backupsData.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <span className="text-6xl mb-4 block">💾</span>
          <p className="text-gray-400">Nenhum backup encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {backupsData.map((deviceData, index) => (
            <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-700/50 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🖥️</span>
                  <div>
                    <h3 className="text-white font-medium">{deviceData.device}</h3>
                    <p className="text-gray-400 text-sm">{deviceData.backups?.length || 0} backups</p>
                  </div>
                </div>
                <button onClick={() => runBackup(devices.find(d => d.hostname === deviceData.device)?.id)}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm">Novo Backup</button>
              </div>

              {deviceData.backups?.length > 0 && (
                <div className="divide-y divide-gray-700">
                  {deviceData.backups.map((backup, bIndex) => (
                    <div key={bIndex} className="flex items-center justify-between p-4 hover:bg-gray-700/30">
                      <div className="flex items-center space-x-4">
                        <span className="text-xl">📄</span>
                        <div>
                          <p className="text-white text-sm font-mono">{backup.name}</p>
                          <p className="text-gray-500 text-xs">{backup.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => viewBackup(backup)} className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded text-sm">Ver</button>
                        <a href={'/' + backup.path} download className="px-3 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded text-sm">Baixar</a>
                        <button onClick={() => deleteBackup(backup, deviceData.device)} className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-sm">Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedBackup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] border border-gray-700 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">{selectedBackup.name}</h3>
              <button onClick={() => setSelectedBackup(null)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap bg-gray-900 p-4 rounded-lg">{backupContent}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Backups;
