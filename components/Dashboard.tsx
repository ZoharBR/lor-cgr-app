import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { DashboardWidget } from '../types';
import { sendMessageToAi } from '../services/geminiService';

// --- MOCK DATA ---
const trafficData = [
  { name: 'Nove', rx: 1.2, tx: 0.8 },
  { name: '6:00am', rx: 3.5, tx: 2.1 },
  { name: '7:00am', rx: 4.8, tx: 3.5 },
  { name: '9:00am', rx: 2.5, tx: 1.8 },
  { name: '10:00am', rx: 3.2, tx: 2.9 },
  { name: '13:00pm', rx: 2.1, tx: 1.5 },
];

const deviceList = [
    { id: 1, name: 'MikroTik CCR1036-8G-25+', status: 'online', type: 'Router', icon: 'fa-network-wired', color: 'text-orange-500' },
    { id: 2, name: 'Huawei NE8000 M4', status: 'online', type: 'Router', icon: 'fa-server', color: 'text-red-500' },
    { id: 3, name: 'Juniper MX104', status: 'online', type: 'Router', icon: 'fa-asterisk', color: 'text-green-500' },
    { id: 4, name: 'FiberHome AN5516-04', status: 'warning', type: 'OLT', icon: 'fa-broadcast-tower', color: 'text-orange-400' },
];

const commandHistory = [
    { id: 1, cmd: 'Configurar VLAN 200', time: '9.5m', user: 'Admin' },
    { id: 2, cmd: 'Backup do router1', time: '6.5m', user: 'System' },
    { id: 3, cmd: 'Checar status SNMP', time: '6.5m', user: 'Admin' },
    { id: 4, cmd: 'Reiniciar servidor02', time: '5.5m', user: 'Admin' },
];

const Dashboard: React.FC = () => {
  const [aiInput, setAiInput] = useState('');

  const handleAiQuickAction = async (action: string) => {
      // Placeholder for quick action logic
      console.log("AI Action:", action);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full pb-20 bg-slate-950">
      
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Bem-vindo, Leonardo!</h1>
        </div>
        <div className="relative w-full md:w-96">
            <input 
                type="text" 
                placeholder="Escreva o que você quer fazer..." 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-4 text-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
            />
            <button className="absolute right-3 top-3 text-slate-500 hover:text-primary">
                <i className="fas fa-paper-plane"></i>
            </button>
        </div>
      </header>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <div>
                  <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><i className="fas fa-server"></i></div>
                      <span className="text-sm text-slate-400 font-medium">Dispositivos Ativos</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                       <span className="flex gap-1">
                           <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                           <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                           <span className="w-2 h-2 rounded-full bg-emerald-500/50"></span>
                       </span>
                  </div>
              </div>
              <div className="text-right">
                  <span className="text-3xl font-bold text-white">28</span>
              </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
              <div>
                  <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"><i className="fas fa-exclamation-triangle"></i></div>
                      <span className="text-sm text-slate-400 font-medium">Alertas Ativos</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                       <span className="flex gap-1">
                           <span className="w-2 h-2 rounded-full bg-red-500"></span>
                           <span className="w-2 h-2 rounded-full bg-red-500"></span>
                       </span>
                  </div>
              </div>
              <div className="text-right">
                  <span className="text-3xl font-bold text-red-500">3</span>
              </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div>
                  <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><i className="fas fa-list-ul"></i></div>
                      <span className="text-sm text-slate-400 font-medium">Jobs em Execução</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                       <span className="flex gap-1">
                           <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                           <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-75"></span>
                       </span>
                  </div>
              </div>
              <div className="text-right">
                  <span className="text-3xl font-bold text-white">2</span>
              </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-lg relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-slate-500"></div>
               <div>
                   <div className="flex items-center gap-2 mb-1">
                       <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300"><i className="fas fa-history"></i></div>
                       <span className="text-sm text-slate-400 font-medium">Backup Agendado</span>
                   </div>
                   <div className="text-xs text-slate-500 mt-2">Hoje, 02:00</div>
               </div>
               <div className="text-right bg-slate-800 rounded px-2 py-1 border border-slate-700">
                    <div className="flex items-center gap-1">
                        <i className="fab fa-pied-piper text-yellow-500"></i>
                        <span className="text-xs font-bold text-white">Pivben</span>
                        <i className="fas fa-chevron-down text-[10px] text-slate-400"></i>
                    </div>
               </div>
          </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left Column (Main Content) */}
          <div className="xl:col-span-8 flex flex-col gap-6">
              
              {/* IPAM Banner */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-slate-200 font-bold flex items-center gap-2">
                          IPAM - Resumo da Rede
                          <i className="fas fa-info-circle text-blue-500 text-xs"></i>
                      </h3>
                      <div className="flex gap-2 text-slate-500 text-sm">
                          <i className="fas fa-external-link-alt hover:text-white cursor-pointer"></i>
                          <i className="fas fa-chevron-right hover:text-white cursor-pointer"></i>
                      </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-950/50 p-4 rounded-lg border border-slate-800/50">
                      <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded border border-slate-700 text-white font-mono w-full md:w-auto justify-between md:justify-start">
                          <span>45.71.242.0/24</span>
                          <i className="fas fa-chevron-down text-slate-500 text-xs"></i>
                      </div>
                      
                      <div className="flex items-center gap-6 w-full md:w-auto justify-around md:justify-end">
                          <div className="flex items-center gap-2">
                              <i className="fas fa-signal text-emerald-500"></i>
                              <div>
                                  <span className="text-xs text-slate-400 block">IP's Usados</span>
                                  <span className="text-xl font-bold text-emerald-500">64</span>
                              </div>
                          </div>
                          <div className="w-[1px] h-8 bg-slate-800"></div>
                          <div className="flex items-center gap-2">
                              <i className="fas fa-leaf text-yellow-500"></i>
                              <div>
                                  <span className="text-xs text-slate-400 block">IPs Livres</span>
                                  <span className="text-xl font-bold text-yellow-200">188</span>
                              </div>
                          </div>
                          <div className="w-[1px] h-8 bg-slate-800"></div>
                           <div className="flex items-center gap-2">
                              <i className="fas fa-th text-blue-500"></i>
                              <div>
                                  <span className="text-xs text-slate-400 block">Sub-Redes</span>
                                  <span className="text-xl font-bold text-blue-400">12</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Devices & Traffic Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Monitored Devices */}
                  <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg h-full">
                       <div className="flex justify-between items-center mb-4">
                          <h3 className="text-slate-200 font-bold">Equipamentos Monitorados</h3>
                          <div className="flex gap-2 text-slate-500 text-sm">
                              <i className="fas fa-external-link-alt hover:text-white cursor-pointer"></i>
                              <i className="fas fa-chevron-right hover:text-white cursor-pointer"></i>
                          </div>
                      </div>
                      <div className="space-y-3">
                          {deviceList.map(dev => (
                              <div key={dev.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 cursor-pointer">
                                  <div className="flex items-center gap-3">
                                      <i className={`fas ${dev.icon} ${dev.color}`}></i>
                                      <span className="text-sm text-slate-300 font-medium">{dev.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <div className="flex gap-1">
                                          <span className={`w-2 h-2 rounded-full ${dev.status === 'online' ? 'bg-emerald-500' : 'bg-yellow-500'}`}></span>
                                          <span className={`w-2 h-2 rounded-full ${dev.status === 'online' ? 'bg-emerald-500' : 'bg-yellow-500/30'}`}></span>
                                      </div>
                                      <i className="fas fa-chevron-down text-slate-500 text-xs"></i>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Traffic Chart */}
                  <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg h-full flex flex-col">
                       <div className="flex justify-between items-center mb-4">
                          <h3 className="text-slate-200 font-bold flex items-center gap-2">
                              <i className="fab fa-google-play text-yellow-500 text-xs"></i>
                              Gráfico de Tráfego
                          </h3>
                          <div className="flex bg-slate-800 rounded p-0.5">
                              <button className="px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded">1h</button>
                              <button className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white">24h</button>
                              <button className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white">Semana</button>
                              <button className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white">Mês</button>
                          </div>
                      </div>
                      <div className="flex-1 min-h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trafficData}>
                            <defs>
                                <linearGradient id="colorRxMain" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.5}/>
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorTxMain" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val} Mbps`} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '12px' }} />
                            <Area type="monotone" dataKey="rx" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorRxMain)" />
                            <Area type="monotone" dataKey="tx" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTxMain)" />
                            </AreaChart>
                        </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              {/* History Row */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-slate-200 font-bold">Historico de Comandos</h3>
                      <div className="flex gap-2 text-slate-500 text-sm">
                          <i className="fas fa-external-link-alt hover:text-white cursor-pointer"></i>
                          <i className="fas fa-chevron-right hover:text-white cursor-pointer"></i>
                      </div>
                  </div>
                  <div className="space-y-2">
                      {commandHistory.map(cmd => (
                          <div key={cmd.id} className="flex items-center justify-between p-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors">
                              <div className="flex items-center gap-3">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  <span className="text-sm text-slate-300">{cmd.cmd}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                  <span className="text-xs text-slate-500"><i className="fas fa-clock mr-1"></i>{cmd.time}</span>
                                  <i className="fas fa-chevron-right text-slate-600 text-xs"></i>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* Right Column (Sidebar Widgets) */}
          <div className="xl:col-span-4 flex flex-col gap-6">
              
              {/* Connection Terminal Widget */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-slate-200 font-bold">Terminal de Conexão</h3>
                      <i className="fas fa-cog text-slate-500 cursor-pointer hover:text-white"></i>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                      <button className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 p-3 rounded border border-slate-700 transition-all text-slate-300 hover:text-white group">
                          <i className="fas fa-user-shield mb-2 text-slate-400 group-hover:text-white"></i>
                          <span className="text-xs font-bold">SSH</span>
                      </button>
                      <button className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 p-3 rounded border border-slate-700 transition-all text-slate-300 hover:text-white group">
                          <i className="fas fa-check-double mb-2 text-slate-400 group-hover:text-white"></i>
                          <span className="text-xs font-bold">Telnet</span>
                      </button>
                      <button className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 p-3 rounded border border-slate-700 transition-all text-slate-300 hover:text-white group">
                          <i className="fas fa-desktop mb-2 text-slate-400 group-hover:text-white"></i>
                          <span className="text-xs font-bold">RDP</span>
                      </button>
                      <button className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 p-3 rounded border border-slate-700 transition-all text-slate-300 hover:text-white group">
                          <i className="fas fa-folder mb-2 text-slate-400 group-hover:text-white"></i>
                          <span className="text-xs font-bold">FTP</span>
                      </button>
                      <button className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 p-3 rounded border border-slate-700 transition-all text-slate-300 hover:text-white group">
                          <i className="fas fa-file-export mb-2 text-slate-400 group-hover:text-white"></i>
                          <span className="text-xs font-bold">SCP</span>
                      </button>
                      <button className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 p-3 rounded border border-slate-700 transition-all text-slate-300 hover:text-white group">
                          <i className="fab fa-windows mb-2 text-slate-400 group-hover:text-white"></i>
                          <span className="text-xs font-bold">Winbox</span>
                      </button>
                  </div>
                  <button className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded text-sm font-bold border border-slate-700 transition-colors">
                      Gerenciar IPAM
                  </button>
              </div>

              {/* IPAM Mini Widget */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-slate-200 font-bold">Integração PHPIPAM</h3>
                      <div className="flex gap-2 text-slate-500 text-sm">
                          <i className="fas fa-external-link-alt hover:text-white cursor-pointer"></i>
                          <i className="fas fa-chevron-right hover:text-white cursor-pointer"></i>
                      </div>
                  </div>
                  <div className="space-y-3">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span className="text-sm text-slate-300">Sub-redes:</span>
                          </div>
                          <span className="text-white font-bold">12</span>
                      </div>
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span className="text-sm text-slate-300">VLANs:</span>
                          </div>
                          <span className="text-white font-bold">8</span>
                      </div>
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                              <span className="text-sm text-slate-300">IP Ativos:</span>
                          </div>
                          <span className="text-white font-bold">64</span>
                      </div>
                  </div>
                   <button className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded text-sm font-bold border border-slate-700 transition-colors flex items-center justify-center gap-2">
                      <i className="fas fa-file-alt"></i> Gerenciar IPAM
                  </button>
              </div>

              {/* AI Assistant Widget */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-slate-200 font-bold flex items-center gap-2">
                          <i className="fas fa-plus text-blue-500 text-xs"></i> Assistente IA
                      </h3>
                      <div className="flex gap-2 text-slate-500 text-sm">
                          <i className="fas fa-trash-alt hover:text-white cursor-pointer"></i>
                          <i className="fas fa-chevron-right hover:text-white cursor-pointer"></i>
                      </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-3">
                      <div className="flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-600">
                               <img src="https://ui-avatars.com/api/?name=AI&background=2563eb&color=fff" alt="AI" />
                          </div>
                          <div className="bg-slate-800 p-3 rounded-lg rounded-tl-none text-xs text-slate-300 border border-slate-700">
                              Como posso ajudar você hoje?
                          </div>
                      </div>

                      <div className="mt-2 space-y-2">
                          <button onClick={() => setAiInput('Criar nova sub-rede')} className="w-full text-left p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-colors flex items-center gap-2">
                              <i className="fas fa-search text-slate-500"></i> Criar nova sub-rede
                          </button>
                          <button onClick={() => setAiInput('Monitorar tráfego')} className="w-full text-left p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-colors flex items-center gap-2">
                              <i className="fas fa-lock text-slate-500"></i> Monitorar tráfego
                          </button>
                          <button onClick={() => setAiInput('Fazer backup')} className="w-full text-left p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-colors flex items-center gap-2">
                              <i className="fas fa-clock text-slate-500"></i> Fazer backup de configuração
                          </button>
                      </div>
                  </div>

                  <div className="mt-4 relative">
                      <input 
                        type="text" 
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white focus:border-blue-500 focus:outline-none pr-8"
                      />
                      <div className="absolute right-1 top-1 flex gap-1">
                           <button className="w-6 h-6 rounded bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-[10px]"><i className="fas fa-times"></i></button>
                           <button className="w-6 h-6 rounded bg-blue-600 text-white hover:bg-blue-500 flex items-center justify-center text-[10px]"><i className="fas fa-paper-plane"></i></button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="fixed bottom-0 left-0 md:left-64 right-0 bg-slate-950 border-t border-slate-800 p-2 flex justify-between items-center px-4 text-[10px] text-slate-400 z-10">
          <div className="flex items-center gap-2">
              <i className="fas fa-check-circle text-emerald-500"></i>
              <span className="font-bold text-slate-300">NTP Server:</span>
              <span>45.71.242.131</span>
              <span className="mx-1">|</span>
              <span>Sincronizado: <span className="text-slate-300">a.ntp.br</span></span>
          </div>
      </footer>
    </div>
  );
};

export default Dashboard;