import React from 'react';
import { 
  LayoutDashboard, 
  Server, 
  Terminal, 
  HardDrive, 
  Bot, 
  Link2, 
  Settings, 
  FileText,
  Shield
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventário', icon: Server },
  { id: 'terminal', label: 'Terminal SSH', icon: Terminal },
  { id: 'backups', label: 'Backups', icon: HardDrive },
  { id: 'ai', label: 'Assistente IA', icon: Bot },
  { id: 'integrations', label: 'Integrações', icon: Link2 },
  { id: 'audit', label: 'Logs Auditoria', icon: FileText },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

function Sidebar({ currentPage, setCurrentPage }) {
  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-lg font-bold text-white">LOR CGR</h1>
            <p className="text-xs text-gray-400">Network Management</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ' + 
                (isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white')}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 text-center">
          v3.0 - NOC System
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
