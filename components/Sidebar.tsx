import React from 'react';
import { AppView, User } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onClose, currentUser, onLogout }) => {
  const menuItems = [
    { id: AppView.DASHBOARD, icon: 'fa-chart-pie', label: 'Dashboard' },
    { id: AppView.INVENTORY, icon: 'fa-server', label: 'Inventário' },
    { id: AppView.TERMINAL, icon: 'fa-network-wired', label: 'Conexões' },
    { id: AppView.FIBERHOME, icon: 'fa-project-diagram', label: 'Gestão GPON' },
    { id: AppView.MONITORING, icon: 'fa-wave-square', label: 'Monitoramento' },
    { id: AppView.IPAM, icon: 'fa-sitemap', label: 'PHPIPAM' },
    { id: AppView.BACKUPS, icon: 'fa-save', label: 'Backups' },
    { id: AppView.NTP, icon: 'fa-clock', label: 'NTP Server' },
    { id: AppView.MANUAL, icon: 'fa-book', label: 'Manual' }, // Moved/Renamed here
    { id: AppView.HISTORY, icon: 'fa-list-alt', label: 'Histórico' },
    { id: AppView.AI_CENTER, icon: 'fa-robot', label: 'IA Assistente', special: true },
    { id: AppView.ADMIN, icon: 'fa-user-shield', label: 'Administração', restricted: true },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-800 flex flex-col h-full transition-all duration-300
        w-64 
        md:w-64 md:translate-x-0 md:static shadow-xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0 bg-slate-950">
           <i className="fas fa-satellite-dish text-primary text-2xl"></i>
           <span className="ml-3 font-bold text-xl text-white tracking-wider">LOR CGR</span>
           <button onClick={onClose} className="md:hidden ml-auto text-slate-400 hover:text-white">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <nav className="flex-1 py-6 space-y-1 overflow-y-auto px-3">
          {menuItems.map((item) => {
             // Hide Admin menu for non-admins if desired
             if (item.restricted && currentUser?.role !== 'ADMIN') return null;

             return (
                <button
                key={item.id}
                onClick={() => {
                    onChangeView(item.id);
                    onClose(); 
                }}
                className={`w-full flex items-center py-3 px-4 rounded-lg transition-all duration-200 group
                    ${currentView === item.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 font-semibold' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    }
                `}
                >
                <i className={`fas ${item.icon} w-6 text-center transition-colors ${
                    currentView === item.id ? 'text-white' : (item.special ? 'text-blue-400 group-hover:text-blue-300' : 'text-slate-500 group-hover:text-slate-300')
                }`}></i>
                <span className="ml-3 text-sm">{item.label}</span>
                {item.special && currentView !== item.id && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                )}
                </button>
             );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-700">
                  <img 
                    src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.username || 'User'}&background=0ea5e9&color=fff`} 
                    alt="User" 
                    className="w-full h-full object-cover"
                  />
              </div>
              <div className="overflow-hidden flex-1">
                  <p className="text-sm font-bold text-white truncate capitalize">{currentUser?.username || 'Guest'}</p>
                  <p className="text-xs text-slate-500 truncate">{currentUser?.role || 'Visitor'}</p>
              </div>
          </div>
          <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-800/50">
             <div className="flex items-center gap-2 text-xs text-slate-500">
                 <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                 <span>Online</span>
             </div>
             <button 
                onClick={onLogout}
                className="text-slate-400 hover:text-red-400 text-xs flex items-center gap-1 transition-colors" title="Sair do Sistema"
             >
                 <i className="fas fa-sign-out-alt"></i> Sair
             </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;