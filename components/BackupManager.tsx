import React, { useState } from 'react';
import { Device, DeviceType } from '../types';

// --- Types ---
interface SystemBackup {
  id: string;
  filename: string;
  type: 'FULL' | 'DB_ONLY' | 'CONFIG_ONLY';
  size: string;
  date: Date;
  status: 'completed' | 'failed' | 'processing';
  user: string;
}

interface DeviceBackupEntry {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  date: Date;
  content: string; // The text content of the backup
  size: string;
}

// --- Mock Data ---
const initialSystemBackups: SystemBackup[] = [
  { id: '1', filename: 'lorcgr_full_backup_20231026.tar.gz', type: 'FULL', size: '1.2 GB', date: new Date(Date.now() - 86400000 * 2), status: 'completed', user: 'System' },
  { id: '2', filename: 'lorcgr_db_daily.sql', type: 'DB_ONLY', size: '45 MB', date: new Date(Date.now() - 86400000), status: 'completed', user: 'Cron' },
];

// Reusing device list structure locally for this component
const devices: Device[] = [
    { id: '1', name: 'Core-CCR2216', ip: '45.71.242.129', type: DeviceType.MIKROTIK, model: 'CCR2216-1G-12XS-2XQ', status: 'online' },
    { id: '2', name: 'NE8000-Core', ip: '45.71.242.130', type: DeviceType.HUAWEI, model: 'NE8000 M4', status: 'online' },
    { id: '3', name: 'OLT-01', ip: '10.10.20.5', type: DeviceType.OLT_FIBERHOME, model: 'AN5516-06', status: 'warning' },
];

const BackupManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'devices'>('devices');
  const [systemBackups, setSystemBackups] = useState<SystemBackup[]>(initialSystemBackups);
  const [deviceBackups, setDeviceBackups] = useState<DeviceBackupEntry[]>([]);
  
  // State for actions
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingBackup, setViewingBackup] = useState<DeviceBackupEntry | null>(null);
  const [editorContent, setEditorContent] = useState('');

  // --- Logic Generators ---

  const generateMockConfig = (device: Device): string => {
    const header = `### LOR CGR AUTO BACKUP ###\n### Device: ${device.name} (${device.ip}) ###\n### Date: ${new Date().toISOString()} ###\n\n`;
    
    if (device.type === DeviceType.MIKROTIK) {
        return header + `# nov/04/2023 15:33:12 by RouterOS 7.12
# software id = ABCD-1234
# model = ${device.model}
/interface bridge
add name=bridge-local
/interface vlan
add interface=bridge-local name=vlan10-mgmt vlan-id=10
add interface=bridge-local name=vlan200-customers vlan-id=200
/ip address
add address=${device.ip}/28 interface=vlan10-mgmt network=45.71.242.128
/ip route
add distance=1 gateway=45.71.242.129
/system identity
set name="${device.name}"
`;
    } else if (device.type === DeviceType.HUAWEI) {
        return header + `! Software Version V800R012C10SPC300
#
sysname ${device.name}
#
vlan batch 10 200
#
interface Vlanif10
 description MGMT_NET
 ip address ${device.ip} 255.255.255.240
#
interface 10GE1/0/1
 undo shutdown
 port link-type trunk
 port trunk allow-pass vlan 10 200
#
bgp 65000
 peer 45.71.242.129 as-number 65000
 #
 ipv4-family unicast
  undo synchronization
  peer 45.71.242.129 enable
#
return`;
    } else {
        return header + `# Generic Config Backup\nhostname ${device.name}\ninterface eth0\n ip address ${device.ip}\n`;
    }
  };

  // --- Actions ---

  const handleSystemBackup = () => {
    setProcessingId('sys-new');
    setTimeout(() => {
        const newBackup: SystemBackup = {
            id: Date.now().toString(),
            filename: `lorcgr_manual_${new Date().toISOString().slice(0,10)}.tar.gz`,
            type: 'FULL',
            size: '1.2 GB',
            date: new Date(),
            status: 'completed',
            user: 'Admin'
        };
        setSystemBackups([newBackup, ...systemBackups]);
        setProcessingId(null);
    }, 2000);
  };

  const handleDeviceBackup = (device: Device) => {
    setProcessingId(device.id);
    // Simulate network delay and command execution
    setTimeout(() => {
        const content = generateMockConfig(device);
        const newBackup: DeviceBackupEntry = {
            id: Date.now().toString(),
            deviceId: device.id,
            deviceName: device.name,
            deviceType: device.type,
            date: new Date(),
            content: content,
            size: `${(content.length / 1024).toFixed(2)} KB`
        };
        setDeviceBackups(prev => [newBackup, ...prev]);
        setProcessingId(null);
    }, 1500);
  };

  const openViewer = (backup: DeviceBackupEntry) => {
      setViewingBackup(backup);
      setEditorContent(backup.content);
  };

  const saveEdits = () => {
      if (viewingBackup) {
          const updatedBackups = deviceBackups.map(b => 
            b.id === viewingBackup.id ? { ...b, content: editorContent } : b
          );
          setDeviceBackups(updatedBackups);
          setViewingBackup(null); // Close modal
          // In real app, this would verify syntax before saving
      }
  };

  const downloadFile = (filename: string, content: string) => {
      const element = document.createElement("a");
      const file = new Blob([content], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-slate-950 text-slate-200 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Central de Backups</h1>
          <p className="text-slate-400 text-sm">Gerenciamento de Snapshots do Sistema e Configurações de Ativos</p>
        </div>
        <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex">
            <button 
                onClick={() => setActiveTab('devices')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'devices' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
                <i className="fas fa-server mr-2"></i> Ativos de Rede
            </button>
            <button 
                onClick={() => setActiveTab('system')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'system' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
                <i className="fas fa-cube mr-2"></i> Sistema LOR CGR
            </button>
        </div>
      </div>

      {/* --- DEVICES TAB --- */}
      {activeTab === 'devices' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Device List */}
              <div className="lg:col-span-1 bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                      <i className="fas fa-list"></i> Inventário
                  </h3>
                  <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                      {devices.map(dev => (
                          <div key={dev.id} className="bg-slate-800 p-3 rounded border border-slate-700 hover:border-slate-500 transition-colors">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <div className="font-bold text-white text-sm">{dev.name}</div>
                                      <div className="text-xs text-slate-400">{dev.ip}</div>
                                      <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 border border-slate-800 mt-1 inline-block">
                                          {dev.type}
                                      </span>
                                  </div>
                                  <button 
                                    onClick={() => handleDeviceBackup(dev)}
                                    disabled={processingId === dev.id}
                                    className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${processingId === dev.id ? 'bg-slate-700 text-slate-400' : 'bg-primary/20 text-primary hover:bg-primary hover:text-white'}`}
                                    title="Fazer Backup Agora"
                                  >
                                      <i className={`fas ${processingId === dev.id ? 'fa-spinner fa-spin' : 'fa-cloud-download-alt'}`}></i>
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Backups List */}
              <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                      <i className="fas fa-history"></i> Histórico de Configurações
                  </h3>
                  {deviceBackups.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-50">
                          <i className="fas fa-file-code text-6xl mb-4"></i>
                          <p>Nenhum backup realizado nesta sessão.</p>
                          <p className="text-sm">Selecione um ativo ao lado para iniciar.</p>
                      </div>
                  ) : (
                      <div className="overflow-y-auto flex-1">
                          <table className="w-full text-left text-sm">
                              <thead className="text-xs uppercase bg-slate-950 text-slate-400 sticky top-0">
                                  <tr>
                                      <th className="p-3">Data/Hora</th>
                                      <th className="p-3">Dispositivo</th>
                                      <th className="p-3">Tamanho</th>
                                      <th className="p-3 text-right">Ações</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                  {deviceBackups.map(bkp => (
                                      <tr key={bkp.id} className="hover:bg-slate-800/50">
                                          <td className="p-3 font-mono text-slate-300">
                                              {bkp.date.toLocaleTimeString()} <span className="text-slate-500 text-xs">{bkp.date.toLocaleDateString()}</span>
                                          </td>
                                          <td className="p-3">
                                              <div className="font-bold text-white">{bkp.deviceName}</div>
                                              <div className="text-[10px] text-slate-500">{bkp.deviceType}</div>
                                          </td>
                                          <td className="p-3 font-mono text-slate-400">{bkp.size}</td>
                                          <td className="p-3 text-right space-x-2">
                                              <button 
                                                onClick={() => openViewer(bkp)}
                                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded border border-slate-700 transition-colors" title="Visualizar/Editar">
                                                  <i className="fas fa-eye"></i>
                                              </button>
                                              <button 
                                                onClick={() => downloadFile(`${bkp.deviceName}_backup.txt`, bkp.content)}
                                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-green-400 rounded border border-slate-700 transition-colors" title="Baixar">
                                                  <i className="fas fa-download"></i>
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- SYSTEM TAB --- */}
      {activeTab === 'system' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-white text-lg">Snapshots do Sistema</h3>
                    <p className="text-slate-400 text-sm">Inclui banco de dados PostgreSQL, configurações de usuários e logs.</p>
                  </div>
                  <button 
                    onClick={handleSystemBackup}
                    disabled={!!processingId}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                  >
                      {processingId === 'sys-new' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                      Gerar Snapshot Completo
                  </button>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-slate-950 text-slate-400 uppercase text-xs font-bold">
                          <tr>
                              <th className="p-4">Arquivo</th>
                              <th className="p-4">Tipo</th>
                              <th className="p-4">Data</th>
                              <th className="p-4">Tamanho</th>
                              <th className="p-4">Usuário</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-sm">
                          {systemBackups.map(bkp => (
                              <tr key={bkp.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="p-4 font-mono text-slate-300">
                                      <i className="fas fa-file-archive text-yellow-500 mr-2"></i>
                                      {bkp.filename}
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${bkp.type === 'FULL' ? 'bg-purple-900/30 text-purple-400 border border-purple-900' : 'bg-blue-900/30 text-blue-400 border border-blue-900'}`}>
                                          {bkp.type}
                                      </span>
                                  </td>
                                  <td className="p-4 text-slate-400">{bkp.date.toLocaleDateString()} {bkp.date.toLocaleTimeString()}</td>
                                  <td className="p-4 font-mono text-slate-400">{bkp.size}</td>
                                  <td className="p-4 text-slate-300">{bkp.user}</td>
                                  <td className="p-4">
                                      {bkp.status === 'completed' && <span className="text-emerald-500 flex items-center gap-1"><i className="fas fa-check-circle"></i> Sucesso</span>}
                                  </td>
                                  <td className="p-4 text-right space-x-2">
                                      <button className="text-slate-400 hover:text-white" title="Restaurar (Cuidado)"><i className="fas fa-undo-alt"></i></button>
                                      <button className="text-slate-400 hover:text-white" title="Baixar"><i className="fas fa-download"></i></button>
                                      <button className="text-red-500 hover:text-red-400" title="Excluir"><i className="fas fa-trash"></i></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- VIEWER/EDITOR MODAL --- */}
      {viewingBackup && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 w-full max-w-4xl h-[80vh] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
                  {/* Modal Header */}
                  <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                      <div>
                          <h3 className="text-white font-bold flex items-center gap-2">
                              <i className="fas fa-edit text-primary"></i> Editor de Configuração
                          </h3>
                          <p className="text-xs text-slate-400 font-mono mt-1">{`${viewingBackup.deviceName}.cfg`}</p>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={saveEdits} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded font-bold transition-colors">
                              <i className="fas fa-save mr-1"></i> Salvar
                          </button>
                          <button onClick={() => setViewingBackup(null)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded border border-slate-700 transition-colors">
                              Fechar
                          </button>
                      </div>
                  </div>
                  
                  {/* Modal Body (Editor) */}
                  <div className="flex-1 relative">
                      <textarea
                          value={editorContent}
                          onChange={(e) => setEditorContent(e.target.value)}
                          className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-4 focus:outline-none resize-none"
                          spellCheck={false}
                      />
                  </div>
                  
                  {/* Modal Footer */}
                  <div className="bg-slate-950 p-2 border-t border-slate-800 text-xs text-slate-500 flex justify-between px-4">
                      <span>Lines: {editorContent.split('\n').length}</span>
                      <span>UTF-8 | {viewingBackup.deviceType} Syntax</span>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default BackupManager;