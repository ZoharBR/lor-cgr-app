import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface AdminPanelProps {
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  currentUser: User;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'interface'>('users');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const initialFormState: Partial<User> = {
      username: '',
      password: '',
      role: 'NOC',
      firstName: '',
      lastName: '',
      company: '',
      phone: '',
      email: '',
      isWhatsapp: false,
      isTelegram: false,
      gender: 'Masculino',
      birthDate: ''
  };
  const [formData, setFormData] = useState<Partial<User>>(initialFormState);

  const openAddModal = () => {
      setEditingUserId(null);
      setFormData(initialFormState);
      setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
      setEditingUserId(user.id);
      setFormData({ ...user, password: user.password }); // Keep password or leave blank to not change? For now, simple logic.
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUserId) {
        // Edit Mode
        const updatedUser: User = {
            ...users.find(u => u.id === editingUserId)!,
            ...formData as User,
            avatar: `https://ui-avatars.com/api/?name=${formData.username}&background=random`
        };
        onUpdateUser(updatedUser);
    } else {
        // Create Mode
        if (!formData.username || !formData.password) return; // Simple validation
        const newUser: User = {
            id: Date.now().toString(),
            language: 'pt-BR',
            ...formData as User,
            avatar: `https://ui-avatars.com/api/?name=${formData.username}&background=random`
        };
        onAddUser(newUser);
    }
    
    setIsModalOpen(false);
  };

  const handleChange = (field: keyof User, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      <div className="p-6 border-b border-slate-800 bg-slate-900">
        <h1 className="text-2xl font-bold text-white mb-2">Administração do Sistema</h1>
        <p className="text-slate-400 text-sm">Gerencie usuários, permissões e configurações globais do LOR CGR.</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings Sidebar */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4 space-y-2">
            <button 
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-primary/20 text-white border border-primary/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <i className="fas fa-users-cog w-5"></i> Gerenciar Usuários
            </button>
            <button 
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-primary/20 text-white border border-primary/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <i className="fas fa-sliders-h w-5"></i> Configurações Gerais
            </button>
            <button 
                onClick={() => setActiveTab('interface')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'interface' ? 'bg-primary/20 text-white border border-primary/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <i className="fas fa-palette w-5"></i> Interface e Tema
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
            
            {/* --- USERS TAB --- */}
            {activeTab === 'users' && (
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">Usuários Cadastrados</h2>
                        <button 
                            onClick={openAddModal}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                        >
                            <i className="fas fa-user-plus"></i> Novo Usuário
                        </button>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                        <table className="w-full text-left">
                            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">Usuário</th>
                                    <th className="p-4">Nome Completo</th>
                                    <th className="p-4">Cargo / Role</th>
                                    <th className="p-4">Contato</th>
                                    <th className="p-4">Empresa</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-sm">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-800/30">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`} alt="" className="w-8 h-8 rounded-full" />
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white">{user.username}</span>
                                                    {user.username === currentUser.username && <span className="text-[10px] text-blue-400">Você</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-300">
                                            {user.firstName} {user.lastName}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold 
                                                ${user.role === 'ADMIN' ? 'bg-purple-900/30 text-purple-400 border border-purple-900' : ''}
                                                ${user.role === 'NOC' ? 'bg-blue-900/30 text-blue-400 border border-blue-900' : ''}
                                                ${user.role === 'READ_ONLY' ? 'bg-slate-800 text-slate-400 border border-slate-700' : ''}
                                            `}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-400 text-xs">
                                            <div className="flex flex-col gap-1">
                                                <span>{user.email}</span>
                                                <span className="flex items-center gap-1">
                                                    {user.phone}
                                                    {user.isWhatsapp && <i className="fab fa-whatsapp text-green-500" title="WhatsApp"></i>}
                                                    {user.isTelegram && <i className="fab fa-telegram text-blue-500" title="Telegram"></i>}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-400">
                                            {user.company || '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => openEditModal(user)}
                                                    className="text-blue-400 hover:text-white p-2 rounded hover:bg-slate-800 transition-colors"
                                                    title="Editar Usuário"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                {user.username !== 'admin' && user.username !== currentUser.username && (
                                                    <button 
                                                        onClick={() => onDeleteUser(user.id)}
                                                        className="text-red-500 hover:text-red-400 p-2 rounded hover:bg-slate-800 transition-colors"
                                                        title="Remover Usuário"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- SETTINGS TAB --- */}
            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <h2 className="text-xl font-bold text-white mb-6">Configurações Gerais do Servidor</h2>
                    
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                            <div>
                                <h3 className="font-bold text-white">Modo Manutenção</h3>
                                <p className="text-xs text-slate-400">Impede o login de usuários não administradores.</p>
                            </div>
                            <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full bg-slate-700 cursor-pointer">
                                <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out"></span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Nome da Instância</label>
                                <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" defaultValue="LOR CGR - Primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Timeout de Sessão (minutos)</label>
                                <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" defaultValue="60" />
                            </div>
                        </div>
                         <div className="mt-6 flex justify-end">
                            <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded font-bold">Salvar Configurações</button>
                        </div>
                    </div>
                </div>
            )}

             {/* --- INTERFACE TAB --- */}
             {activeTab === 'interface' && (
                 <div className="max-w-2xl mx-auto space-y-6">
                    <h2 className="text-xl font-bold text-white mb-6">Personalização de Interface</h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div className="bg-slate-800 p-4 rounded-xl border-2 border-primary cursor-pointer">
                             <div className="h-20 bg-slate-900 rounded mb-2 border border-slate-700 flex items-center justify-center text-slate-500">Dark Mode</div>
                             <span className="font-bold text-white flex items-center gap-2"><i className="fas fa-check-circle text-primary"></i> Slate Dark (Padrão)</span>
                         </div>
                         <div className="bg-slate-200 p-4 rounded-xl border-2 border-transparent opacity-50 cursor-not-allowed">
                             <div className="h-20 bg-white rounded mb-2 border border-gray-300 flex items-center justify-center text-gray-400">Light Mode</div>
                             <span className="font-bold text-slate-800">Light (Em breve)</span>
                         </div>
                    </div>
                 </div>
             )}
        </div>

        {/* --- ADD/EDIT USER MODAL --- */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-fadeIn max-h-[90vh]">
                    <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <i className="fas fa-user-edit text-primary"></i> {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><i className="fas fa-times"></i></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        <form id="userForm" onSubmit={handleSubmit} className="space-y-4">
                            
                            {/* Personal Info */}
                            <h4 className="text-xs uppercase text-slate-500 font-bold border-b border-slate-800 pb-1 mb-2">Dados Pessoais</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Nome</label>
                                    <input required type="text" value={formData.firstName || ''} onChange={e => handleChange('firstName', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Sobrenome</label>
                                    <input required type="text" value={formData.lastName || ''} onChange={e => handleChange('lastName', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Data de Nascimento</label>
                                    <input type="date" value={formData.birthDate || ''} onChange={e => handleChange('birthDate', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Sexo</label>
                                    <select value={formData.gender || 'Masculino'} onChange={e => handleChange('gender', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none">
                                        <option value="Masculino">Masculino</option>
                                        <option value="Feminino">Feminino</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </div>
                            </div>

                            {/* Contact & Company */}
                            <h4 className="text-xs uppercase text-slate-500 font-bold border-b border-slate-800 pb-1 mb-2 mt-4">Corporativo & Contato</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Empresa</label>
                                    <input type="text" value={formData.company || ''} onChange={e => handleChange('company', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">E-mail</label>
                                    <input type="email" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none" />
                                </div>
                                <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs text-slate-400 mb-1">Telefone / Celular</label>
                                        <input type="text" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none" />
                                    </div>
                                    <div className="flex items-center gap-4 mt-4">
                                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                            <input type="checkbox" checked={formData.isWhatsapp || false} onChange={e => handleChange('isWhatsapp', e.target.checked)} className="rounded border-slate-700 bg-slate-950 text-primary" />
                                            <i className="fab fa-whatsapp text-green-500"></i> WhatsApp
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                            <input type="checkbox" checked={formData.isTelegram || false} onChange={e => handleChange('isTelegram', e.target.checked)} className="rounded border-slate-700 bg-slate-950 text-primary" />
                                            <i className="fab fa-telegram text-blue-500"></i> Telegram
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Access Control */}
                            <h4 className="text-xs uppercase text-slate-500 font-bold border-b border-slate-800 pb-1 mb-2 mt-4">Acesso ao Sistema</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Login (Usuário)</label>
                                    <input required type="text" value={formData.username || ''} onChange={e => handleChange('username', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Senha {editingUserId && '(Deixe em branco para manter)'}</label>
                                    <input type="password" value={formData.password || ''} onChange={e => handleChange('password', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Cargo (Role)</label>
                                    <select value={formData.role || 'NOC'} onChange={e => handleChange('role', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none">
                                        <option value="ADMIN">Administrador</option>
                                        <option value="NOC">NOC (Operacional)</option>
                                        <option value="READ_ONLY">Somente Leitura</option>
                                    </select>
                                </div>
                            </div>

                        </form>
                    </div>

                    <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors">Cancelar</button>
                        <button type="submit" form="userForm" className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded font-bold transition-colors">
                            {editingUserId ? 'Salvar Alterações' : 'Criar Usuário'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;