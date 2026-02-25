import React from 'react';

const Sidebar = ({ currentPage, setCurrentPage }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'inventory', label: 'Inventário', icon: '🖥️' },
    { id: 'terminal', label: 'Terminal SSH', icon: '💻' },
    { id: 'backups', label: 'Backups', icon: '💾' },
    { id: 'audit', label: 'Logs', icon: '📋' },
    { id: 'integrations', label: 'Integrações', icon: '🔗' },
    { id: 'ai', label: 'Assistente IA', icon: '🤖' },
    { id: 'settings', label: 'Configurações', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-xl">🌐</div>
          <div>
            <h1 className="text-lg font-bold text-white">LOR CGR</h1>
            <p className="text-xs text-gray-400">Network Management</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={'w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ' + 
              (currentPage === item.id 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700')}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-400">Sistema Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
