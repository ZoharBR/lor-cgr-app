import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Terminal from './components/Terminal';
import Backups from './components/Backups';
import AuditLogs from './components/AuditLogs';
import Settings from './components/Settings';
import Integrations from './components/Integrations';
import AIAssistant from './components/AIAssistant';
import UsersManagement from './components/UsersManagement';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory />;
      case 'terminal': return <Terminal />;
      case 'backups': return <Backups />;
      case 'audit': return <AuditLogs />;
      case 'integrations': return <Integrations />;
      case 'ai': return <AIAssistant />;
      case 'users': return <UsersManagement />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  const pageTitle = {
    dashboard: 'Dashboard',
    inventory: 'Inventario de Dispositivos',
    terminal: 'Terminal SSH',
    backups: 'Gerenciamento de Backups',
    audit: 'Logs de Auditoria',
    integrations: 'Integracoes Externas',
    ai: 'Assistente IA NOC',
    users: 'Gerenciar Usuarios',
    settings: 'Configuracoes'
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 overflow-auto bg-gray-900">
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">{pageTitle[currentPage]}</h1>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">A</span>
              </div>
              <span className="text-sm text-gray-300">Admin</span>
            </div>
          </div>
        </header>
        <div className="p-6 h-[calc(100vh-80px)]">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
