import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Terminal from './components/Terminal';
import AiAssistant from './components/AiAssistant';
import ServerSetupGuide from './components/ServerSetupGuide';
import NtpManager from './components/NtpManager';
import BackupManager from './components/BackupManager';
import FiberHomeManager from './components/FiberHomeManager';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { AppView, Device, DeviceType, User } from './types';

// Mock Component for simple lists - Updated to match generic views
const PlaceholderView = ({ title }: { title: string }) => {
    return (
         <div className="p-10 flex items-center justify-center h-full text-slate-500 bg-slate-950">
            <div className="text-center">
                <i className="fas fa-hard-hat text-6xl mb-4 text-slate-800"></i>
                <h2 className="text-2xl font-bold text-slate-300">{title}</h2>
                <p>Módulo em desenvolvimento.</p>
            </div>
        </div>
    )
}

const DeviceList = () => {
    const devices: Device[] = [
        { id: '1', name: 'Core-CCR2216', ip: '45.71.242.129', type: DeviceType.MIKROTIK, model: 'CCR2216-1G-12XS-2XQ', status: 'online', uptime: '45d 12h' },
        { id: '2', name: 'NE8000-Core', ip: '45.71.242.130', type: DeviceType.HUAWEI, model: 'NE8000 M4', status: 'online', uptime: '120d 2h' },
        { id: '3', name: 'OLT-01', ip: '10.10.20.5', type: DeviceType.OLT_FIBERHOME, model: 'AN5516-06', status: 'warning', uptime: '2d 4h' },
        { id: '4', name: 'ESXi-Host-01', ip: '192.168.100.5', type: DeviceType.VMWARE_ESXI, model: '6.5', status: 'online', uptime: '300d' },
    ];

    return (
        <div className="p-4 md:p-6 h-full overflow-y-auto pb-20 bg-slate-950">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Ativos de Rede</h2>
            <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-800 text-slate-400 uppercase text-xs font-bold border-b border-slate-700">
                            <tr>
                                <th className="p-4">Status</th>
                                <th className="p-4">Nome</th>
                                <th className="p-4">IP</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Modelo</th>
                                <th className="p-4">Uptime</th>
                                <th className="p-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {devices.map(dev => (
                                <tr key={dev.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <span className={`inline-block w-3 h-3 rounded-full ${dev.status === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-yellow-500'}`}></span>
                                    </td>
                                    <td className="p-4 font-bold text-white">{dev.name}</td>
                                    <td className="p-4 font-mono text-sm text-slate-400">{dev.ip}</td>
                                    <td className="p-4"><span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-xs">{dev.type}</span></td>
                                    <td className="p-4 text-sm text-slate-500">{dev.model}</td>
                                    <td className="p-4 text-sm">{dev.uptime}</td>
                                    <td className="p-4 flex gap-2">
                                        <button className="p-2 hover:bg-slate-700 rounded text-blue-400" title="Terminal"><i className="fas fa-terminal"></i></button>
                                        <button className="p-2 hover:bg-slate-700 rounded text-emerald-400" title="Backup"><i className="fas fa-save"></i></button>
                                        <button className="p-2 hover:bg-slate-700 rounded text-purple-400" title="Web"><i className="fas fa-globe"></i></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

const IpamIntegration = () => {
    return (
        <div className="p-4 md:p-6 h-full flex flex-col overflow-y-auto bg-slate-950">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white">PHPIPAM Integration</h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none bg-primary hover:bg-primary-hover px-4 py-2 rounded text-white text-sm font-bold text-center transition-colors">Sincronizar</button>
                    <button className="flex-1 md:flex-none bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 py-2 rounded text-slate-300 text-sm text-center transition-colors">Config API</button>
                </div>
            </div>
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative min-h-[400px]">
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 flex-col p-4">
                     <i className="fas fa-network-wired text-4xl md:text-6xl mb-4 text-slate-700"></i>
                     <p className="text-lg font-bold text-center text-slate-300">Conectado ao PHPIPAM Server</p>
                     <p className="font-mono bg-slate-950 border border-slate-800 px-3 py-1.5 rounded mt-2 text-xs md:text-sm break-all text-center text-green-500">API: https://45.71.243.138/api/lorcgr/</p>
                     
                     <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl px-2 md:px-6">
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden group hover:border-blue-500 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><i className="fas fa-project-diagram text-6xl text-blue-500"></i></div>
                            <h3 className="font-bold text-slate-400 text-sm uppercase">Subnets</h3>
                            <p className="text-3xl font-bold text-blue-500 mt-2">124</p>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden group hover:border-emerald-500 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><i className="fas fa-check-circle text-6xl text-emerald-500"></i></div>
                            <h3 className="font-bold text-slate-400 text-sm uppercase">IPs Used</h3>
                            <p className="text-3xl font-bold text-emerald-500 mt-2">1,204</p>
                        </div>
                         <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden group hover:border-red-500 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><i className="fas fa-chart-pie text-6xl text-red-500"></i></div>
                            <h3 className="font-bold text-slate-400 text-sm uppercase">Free Space</h3>
                            <p className="text-3xl font-bold text-red-500 mt-2">45%</p>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    )
}

const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Registered Users State (In a real app, this comes from DB)
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([
      { 
        id: '1', 
        username: 'admin', 
        password: 'admin', 
        role: 'ADMIN', 
        language: 'pt-BR',
        firstName: 'Leonardo',
        lastName: 'Costa',
        email: 'leonardo@lorcgr.net',
        company: 'LOR CGR Systems',
        phone: '+55 67 99999-9999',
        isWhatsapp: true,
        gender: 'Masculino'
      }
  ]);

  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Auth Handlers ---
  const handleLogin = async (u: string, p: string): Promise<boolean> => {
      const userFound = registeredUsers.find(user => user.username === u && user.password === p);
      if (userFound) {
          setCurrentUser(userFound);
          return true;
      }
      return false;
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setCurrentView(AppView.DASHBOARD);
  };

  // --- User Management Handlers ---
  const addUser = (user: User) => {
      setRegisteredUsers([...registeredUsers, user]);
  };

  const updateUser = (updatedUser: User) => {
      setRegisteredUsers(registeredUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
      // Update current user if it's the one being edited
      if (currentUser && currentUser.id === updatedUser.id) {
          setCurrentUser(updatedUser);
      }
  };

  const deleteUser = (userId: string) => {
      setRegisteredUsers(registeredUsers.filter(u => u.id !== userId));
  };

  // If not logged in, show Login Screen
  if (!currentUser) {
      return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard />;
      case AppView.TERMINAL:
        return <Terminal />;
      case AppView.AI_CENTER:
        return <AiAssistant />;
      case AppView.MANUAL: // Updated View Name
        return <ServerSetupGuide />;
      case AppView.INVENTORY:
        return <DeviceList />;
      case AppView.IPAM:
        return <IpamIntegration />;
      case AppView.NTP:
        return <NtpManager />;
      case AppView.BACKUPS:
        return <BackupManager />;
      case AppView.FIBERHOME:
        return <FiberHomeManager />;
      case AppView.ADMIN:
        return (
            <AdminPanel 
                users={registeredUsers} 
                currentUser={currentUser}
                onAddUser={addUser} 
                onUpdateUser={updateUser}
                onDeleteUser={deleteUser} 
            />
        );
      case AppView.MONITORING:
        return <PlaceholderView title="Monitoramento" />;
      case AppView.HISTORY:
        return <PlaceholderView title="Histórico" />;
      default:
        return <PlaceholderView title="Módulo" />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-primary selection:text-white">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
        
        {/* Top Header Overlay for Icons (Desktop) / Hamburger (Mobile) */}
        <div className="absolute top-0 right-0 left-0 h-16 pointer-events-none z-20 flex justify-between items-center px-4 md:px-6">
            {/* Mobile Hamburger */}
            <div className="pointer-events-auto md:hidden pt-2">
                 <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="text-slate-200 hover:text-white p-2 rounded-lg bg-slate-900 border border-slate-800"
                >
                    <i className="fas fa-bars text-xl"></i>
                </button>
            </div>

            {/* Desktop Top Right Icons */}
            <div className="hidden md:flex pointer-events-auto ml-auto gap-4 items-center h-full">
                 <button className="text-slate-400 hover:text-white transition-colors relative">
                    <i className="fas fa-search text-lg"></i>
                 </button>
                 <button className="text-slate-400 hover:text-white transition-colors relative">
                    <i className="fas fa-bell text-lg"></i>
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                 </button>
                 <button 
                    onClick={() => setCurrentView(AppView.ADMIN)}
                    className="text-slate-400 hover:text-white transition-colors"
                 >
                    <i className="fas fa-cog text-lg"></i>
                 </button>
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600">
                    <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.username}&background=0ea5e9&color=fff`} alt="User" />
                  </div>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative pt-16 md:pt-0">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;