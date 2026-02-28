import React, { useState, useEffect } from 'react';
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
import Login from './components/Login';
import { Button } from './components/ui/button';
import { LogOut } from 'lucide-react';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check/', { credentials: 'include' });
      const data = await response.json();
      if (data.authenticated) setUser(data.user);
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout/', { method: 'POST', credentials: 'include' });
    } catch (err) {}
    setUser(null);
    setCurrentPage('dashboard');
  };

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

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Carregando...</div>;
  if (!user) return <Login onLogin={handleLogin} />;

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
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-400 hover:text-white"><LogOut className="w-4 h-4" /></Button>
            </div>
          </div>
        </header>
        <div className="p-6 h-[calc(100vh-80px)]">{renderPage()}</div>
      </main>
    </div>
  );
}

export default App;
