import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import Inventory from './Inventory';
import Terminal from './Terminal';
import Backups from './Backups';
import AuditLogs from './AuditLogs';
import Settings from './Settings';
import Integrations from './Integrations';
import AIAssistant from './AIAssistant';
import UsersManagement from './UsersManagement';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

function MainApp({ user, onLogout }) {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'inventory': return <Inventory user={user} />;
      case 'terminal': return <Terminal user={user} />;
      case 'backups': return <Backups user={user} />;
      case 'audit': return <AuditLogs user={user} />;
      case 'integrations': return <Integrations user={user} />;
      case 'ai': return <AIAssistant user={user} />;
      case 'users': return <UsersManagement user={user} />;
      case 'settings': return <Settings user={user} />;
      default: return <Dashboard user={user} />;
    }
  };

  const pageTitle = {
    dashboard: 'Dashboard', inventory: 'Inventario', terminal: 'Terminal SSH',
    backups: 'Backups', audit: 'Logs', integrations: 'Integracoes',
    ai: 'Assistente IA', users: 'Usuarios', settings: 'Configuracoes'
  };

  const getRoleBadge = (role) => {
    const s = { ADMIN: 'bg-red-500/20 text-red-400', NOC: 'bg-blue-500/20 text-blue-400', LEITURA: 'bg-gray-500/20 text-gray-400' };
    return s[role] || s.LEITURA;
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} user={user} />
      <main className="flex-1 overflow-auto bg-gray-900">
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">{pageTitle[currentPage]}</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{(user.name || user.username)[0].toUpperCase()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-white">{user.name || user.username}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadge(user.role)}`}>{user.role}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout} className="text-zinc-400 hover:text-white">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
        <div className="p-6 h-[calc(100vh-80px)]">{renderPage()}</div>
      </main>
    </div>
  );
}

export default MainApp;
