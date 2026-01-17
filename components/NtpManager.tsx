import React, { useState, useEffect } from 'react';

interface NtpPeer {
  id: number;
  address: string;
  refId: string;
  stratum: number;
  delay: string;
  offset: string;
  jitter: string;
  status: 'active' | 'candidate' | 'outlier';
}

const NtpManager: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [peers, setPeers] = useState<NtpPeer[]>([
    { id: 1, address: 'a.st1.ntp.br', refId: '.GPS.', stratum: 1, delay: '14.231', offset: '0.042', jitter: '0.015', status: 'active' },
    { id: 2, address: 'b.st1.ntp.br', refId: '.GPS.', stratum: 1, delay: '15.102', offset: '-0.121', jitter: '0.041', status: 'candidate' },
    { id: 3, address: 'c.st1.ntp.br', refId: '.GPS.', stratum: 1, delay: '18.441', offset: '0.210', jitter: '0.088', status: 'candidate' },
    { id: 4, address: 'd.st1.ntp.br', refId: '.GPS.', stratum: 1, delay: '14.998', offset: '0.003', jitter: '0.022', status: 'candidate' },
  ]);

  const [configContent, setConfigContent] = useState(`# /etc/ntp.conf
# Configuração NTP LOR CGR Server
# Gerado automaticamente pelo Painel Web

driftfile /var/lib/ntp/ntp.drift

# Permitir que este servidor sirva tempo para a rede local
restrict default nomodify notrap nopeer noquery
restrict 127.0.0.1
restrict ::1
restrict 45.71.242.128 mask 255.255.255.240 nomodify notrap

# Servidores Públicos (NTP.br)
server a.st1.ntp.br iburst
server b.st1.ntp.br iburst
server c.st1.ntp.br iburst
server d.st1.ntp.br iburst
`);

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    // Simulate server command `sudo ntpdate -u a.ntp.br`
    setTimeout(() => {
      setIsSyncing(false);
      // Simulate slight time adjustment
      const newDate = new Date();
      newDate.setMilliseconds(newDate.getMilliseconds() + 50); 
      setCurrentTime(newDate);
    }, 2000);
  };

  const handleSaveConfig = () => {
    setIsEditing(false);
    // Here we would parse the configContent to update the peers list in a real app
    // For now, we simulate a service restart
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1500);
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-slate-950 text-slate-200 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">NTP Server Manager</h1>
          <p className="text-slate-400 text-sm">Gerenciamento de Tempo e Sincronização (Chrony/NTPD)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-2xl font-mono font-bold text-emerald-400">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {currentTime.toLocaleDateString()} | UTC-03:00
            </div>
          </div>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isSyncing ? 'bg-slate-700 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white'}`}
          >
            <i className={`fas fa-sync-alt ${isSyncing ? 'animate-spin' : ''}`}></i>
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Card */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg lg:col-span-1">
          <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">Status do Serviço</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <span className="text-slate-400">Estado Operacional:</span>
               <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded border border-emerald-500/30 flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Ativo (Running)
               </span>
            </div>
            
            <div className="flex justify-between items-center">
               <span className="text-slate-400">Stratum Local:</span>
               <span className="font-mono text-white font-bold">2</span>
            </div>

            <div className="flex justify-between items-center">
               <span className="text-slate-400">Drift do Relógio:</span>
               <span className="font-mono text-blue-400">0.042 ppm</span>
            </div>

            <div className="bg-slate-800 rounded p-3 text-xs font-mono text-slate-400 border border-slate-700 mt-4">
               <p>Last update: {new Date().toLocaleTimeString()} successful.</p>
               <p>Reference ID: 200.160.7.186 (a.st1.ntp.br)</p>
               <p>Root Delay: 0.0142s</p>
            </div>
          </div>
        </div>

        {/* Peers List / Edit Config */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg lg:col-span-2 flex flex-col">
           <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
             <h3 className="text-lg font-bold text-white">Upstream Peers</h3>
             <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-700 transition-colors"
             >
                <i className={`fas ${isEditing ? 'fa-list' : 'fa-edit'} mr-2`}></i>
                {isEditing ? 'Voltar para Lista' : 'Editar Configuração'}
             </button>
           </div>

           {isEditing ? (
             <div className="flex-1 flex flex-col animate-fadeIn">
               <p className="text-sm text-slate-400 mb-2">Edite o arquivo <code>/etc/ntp.conf</code> diretamente. Cuidado ao alterar.</p>
               <textarea 
                  value={configContent}
                  onChange={(e) => setConfigContent(e.target.value)}
                  className="flex-1 w-full bg-black text-green-400 font-mono text-sm p-4 rounded border border-slate-700 focus:outline-none focus:border-primary min-h-[300px]"
                  spellCheck={false}
               />
               <div className="mt-4 flex justify-end gap-3">
                 <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                 <button onClick={handleSaveConfig} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold">
                   <i className="fas fa-save mr-2"></i> Salvar e Reiniciar
                 </button>
               </div>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="text-xs text-slate-500 border-b border-slate-800 uppercase">
                     <th className="py-2 px-2">Status</th>
                     <th className="py-2 px-2">Remote</th>
                     <th className="py-2 px-2">RefID</th>
                     <th className="py-2 px-2 text-center">St</th>
                     <th className="py-2 px-2 text-right">Delay (ms)</th>
                     <th className="py-2 px-2 text-right">Offset (ms)</th>
                     <th className="py-2 px-2 text-right">Jitter</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm font-mono">
                   {peers.map((peer) => (
                     <tr key={peer.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                       <td className="py-3 px-2">
                         {peer.status === 'active' && <span className="text-green-500" title="Active Peer">*</span>}
                         {peer.status === 'candidate' && <span className="text-blue-500" title="Candidate">+</span>}
                         {peer.status === 'outlier' && <span className="text-red-500" title="Outlier">-</span>}
                       </td>
                       <td className="py-3 px-2 text-slate-200">{peer.address}</td>
                       <td className="py-3 px-2 text-slate-500 text-xs">{peer.refId}</td>
                       <td className="py-3 px-2 text-center text-slate-400">{peer.stratum}</td>
                       <td className="py-3 px-2 text-right text-slate-300">{peer.delay}</td>
                       <td className="py-3 px-2 text-right text-slate-300">{peer.offset}</td>
                       <td className="py-3 px-2 text-right text-slate-300">{peer.jitter}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               <div className="mt-4 p-3 bg-blue-900/10 border border-blue-900/30 rounded text-xs text-blue-400 flex items-start gap-2">
                 <i className="fas fa-info-circle mt-0.5"></i>
                 <p>O servidor NTP está configurado para permitir consultas da rede local <strong>45.71.242.128/28</strong>. Equipamentos MikroTik e Huawei devem apontar para o IP deste servidor (45.71.242.131).</p>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default NtpManager;