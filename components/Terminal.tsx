import React, { useState } from 'react';
import { TerminalSession } from '../types';

const initialSessions: TerminalSession[] = [
  { id: '1', name: 'Core Router', protocol: 'SSH', host: '45.71.242.129', port: 22, tags: ['mikrotik', 'core'] },
  { id: '2', name: 'OLT Principal', protocol: 'TELNET', host: '10.10.10.2', port: 23, tags: ['fiberhome', 'pon'] },
  { id: '3', name: 'Winbox Core', protocol: 'WINBOX', host: '45.71.242.129', port: 8291, tags: ['gui'] },
  { id: '4', name: 'Server Ubuntu', protocol: 'SSH', host: '45.71.242.131', port: 22, tags: ['linux', 'app-server'] },
];

const Terminal: React.FC = () => {
  const [sessions, setSessions] = useState<TerminalSession[]>(initialSessions);
  const [activeSession, setActiveSession] = useState<TerminalSession | null>(null);

  const handleConnect = (session: TerminalSession) => {
    setActiveSession(session);
    // In a real app, this would initiate a WebSocket connection to a backend proxy (e.g. Guacamole)
  };

  return (
    <div className="flex h-full bg-slate-900 relative">
      {/* Sidebar List (Hosts) 
          - Mobile: Hidden if session is active
          - Desktop: Always visible (w-1/4)
      */}
      <div className={`
          flex-col border-r border-slate-700 bg-slate-950 overflow-y-auto
          w-full md:w-1/4
          ${activeSession ? 'hidden md:flex' : 'flex h-full'}
      `}>
        <div className="p-4 border-b border-slate-800">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Hosts</h2>
                <button className="bg-primary hover:bg-primary-hover text-white p-2 rounded-md text-sm">
                    <i className="fas fa-plus"></i> Novo
                </button>
            </div>
            <div className="relative">
                <input type="text" placeholder="Pesquisar..." className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-primary" />
                <i className="fas fa-search absolute right-3 top-3 text-slate-500 text-xs"></i>
            </div>
        </div>
        
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sessions.map((session) => (
            <div 
                key={session.id} 
                onClick={() => handleConnect(session)}
                className={`p-3 rounded-lg cursor-pointer transition-colors border border-transparent ${activeSession?.id === session.id ? 'bg-slate-800 border-slate-600' : 'hover:bg-slate-900'}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-200">{session.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${session.protocol === 'SSH' ? 'bg-purple-900 text-purple-300' : 'bg-orange-900 text-orange-300'}`}>
                    {session.protocol}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center">
                 <i className="fas fa-network-wired mr-1"></i> {session.host}:{session.port}
              </div>
              <div className="mt-2 flex gap-1 flex-wrap">
                  {session.tags?.map(tag => (
                      <span key={tag} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">#{tag}</span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal Area 
          - Mobile: Hidden if NO session active
          - Desktop: Always visible (flex-1)
      */}
      <div className={`
          flex-col bg-slate-900 relative
          w-full md:flex-1
          ${activeSession ? 'flex h-full' : 'hidden md:flex'}
      `}>
        {activeSession ? (
          <>
            <div className="h-10 bg-slate-850 border-b border-slate-700 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                    {/* Back Button (Mobile Only) */}
                    <button 
                        onClick={() => setActiveSession(null)}
                        className="md:hidden mr-2 text-slate-400 hover:text-white"
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                    <span className="font-mono text-sm truncate">{activeSession.user || 'root'}@{activeSession.host}</span>
                </div>
                <div className="flex gap-3 shrink-0">
                    <button className="text-slate-400 hover:text-white" title="Copiar"><i className="fas fa-copy"></i></button>
                    <button className="text-slate-400 hover:text-white" title="Config"><i className="fas fa-cog"></i></button>
                    <button className="text-red-500 hover:text-red-400" title="Desconectar" onClick={() => setActiveSession(null)}><i className="fas fa-plug-circle-xmark"></i></button>
                </div>
            </div>
            <div className="flex-1 p-4 font-mono text-sm overflow-auto text-green-400 bg-black">
              <p>Connecting to {activeSession.host} via {activeSession.protocol}...</p>
              <p>Connection established.</p>
              <p className="mt-2 text-slate-500">Welcome to LOR CGR Secure Shell.</p>
              <p className="text-slate-500">System load: 0.12, 0.05, 0.01</p>
              <br />
              {activeSession.protocol === 'WINBOX' ? (
                  <div className="flex flex-col items-center justify-center h-64 border border-slate-700 border-dashed rounded mt-4">
                      <i className="fas fa-window-maximize text-4xl text-slate-600 mb-4"></i>
                      <p className="text-slate-400">Integração Winbox Web detectada.</p>
                      <button className="mt-4 px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-500">Abrir Sessão Webfig</button>
                  </div>
              ) : (
                <>
                    <p>[admin@{activeSession.host}] &gt; <span className="animate-pulse">_</span></p>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <i className="fas fa-terminal text-6xl mb-4 text-slate-700"></i>
            <p className="text-lg">Selecione um host para conectar</p>
            <p className="text-sm hidden md:block">SSH, Telnet, FTP, RDP suportados</p>
            <p className="text-sm md:hidden mt-4 text-slate-600">Use a lista para selecionar um dispositivo</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Terminal;