import React, { useState, useEffect } from 'react'
import { User, Plus, Edit, Trash2, Search, Download, Shield, CheckCircle, XCircle, FileText } from 'lucide-react'

const ROLE_COLORS = {
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  noc: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  leitura: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

const ROLE_LABELS = {
  admin: 'Admin',
  noc: 'NOC',
  leitura: 'Leitura'
}

export default function UsersManagement() {
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [formData, setFormData] = useState({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'leitura', phone: '', department: '' })

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (e) { console.error('Erro:', e) }
    setLoading(false)
  }

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/logs/')
      const data = await res.json()
      setLogs(data.logs || [])
      setShowLogsModal(true)
    } catch (e) { console.error('Erro:', e) }
  }

  const exportLogs = () => { window.open('/api/logs/export/', '_blank') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = selectedUser ? '/api/users/' + selectedUser.id + '/update/' : '/api/users/create/'
      const method = selectedUser ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const data = await res.json()
      if (data.success) { setShowModal(false); loadUsers(); resetForm() }
      else { alert(data.error || 'Erro ao salvar') }
    } catch (e) { alert('Erro: ' + e.message) }
  }

  const handleDelete = async (userId) => {
    if (!confirm('Tem certeza que deseja excluir este usuario?')) return
    try {
      const res = await fetch('/api/users/' + userId + '/delete/', { method: 'DELETE' })
      const data = await res.json()
      if (data.success) loadUsers()
      else alert(data.error || 'Erro')
    } catch (e) { alert('Erro: ' + e.message) }
  }

  const resetForm = () => {
    setFormData({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'leitura', phone: '', department: '' })
    setSelectedUser(null)
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setFormData({ username: user.username, email: user.email || '', password: '', first_name: user.first_name || '', last_name: user.last_name || '', role: user.role || 'leitura', phone: user.phone || '', department: user.department || '' })
    setShowModal(true)
  }

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || (u.email && u.email.toLowerCase().includes(search.toLowerCase())))

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Gerenciar Usuarios</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={loadLogs} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-gray-300"><FileText className="w-4 h-4" /> Logs</button>
            <button onClick={exportLogs} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-gray-300"><Download className="w-4 h-4" /> Exportar</button>
            <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 text-white"><Plus className="w-4 h-4" /> Novo</button>
          </div>
        </div>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Buscar usuario..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? <div className="text-center py-8 text-gray-400">Carregando...</div> : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Usuario</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Telefone</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Nivel</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-300">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center"><User className="w-4 h-4 text-blue-400" /></div>
                        <div><div className="font-medium text-white">{user.username}</div><div className="text-xs text-gray-500">{user.full_name || '-'}</div></div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{user.email || '-'}</td>
                    <td className="py-3 px-4 text-gray-400">{user.phone || '-'}</td>
                    <td className="py-3 px-4"><span className={'px-2 py-1 rounded text-xs font-medium border ' + (ROLE_COLORS[user.role] || ROLE_COLORS.leitura)}>{ROLE_LABELS[user.role] || 'Leitura'}</span></td>
                    <td className="py-3 px-4">{user.is_active ? <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle className="w-4 h-4" /> Ativo</span> : <span className="flex items-center gap-1 text-red-400 text-sm"><XCircle className="w-4 h-4" /> Inativo</span>}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEditModal(user)} className="p-2 hover:bg-gray-600 rounded-lg"><Edit className="w-4 h-4 text-gray-400" /></button>
                        {user.role !== 'admin' && <button onClick={() => handleDelete(user.id)} className="p-2 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-white mb-4">{selectedUser ? 'Editar Usuario' : 'Novo Usuario'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">Username *</label><input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" disabled={!!selectedUser} required /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" /></div>
              </div>
              {!selectedUser && <div><label className="block text-sm text-gray-400 mb-1">Senha *</label><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" required /></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">Nome</label><input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Sobrenome</label><input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">Telefone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" placeholder="(00) 00000-0000" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Departamento</label><input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" /></div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nivel de Acesso *</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white">
                  <option value="admin">Admin - Acesso Total (pode apagar tudo)</option>
                  <option value="noc">NOC - Operacional (nao pode apagar)</option>
                  <option value="leitura">Leitura - Somente Visualizar</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-700">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-gray-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 text-white">{selectedUser ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Logs de Acesso</h2>
              <button onClick={() => setShowLogsModal(false)} className="text-gray-400 hover:text-white text-xl">X</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr><th className="text-left py-2 px-3 text-gray-300">Usuario</th><th className="text-left py-2 px-3 text-gray-300">Acao</th><th className="text-left py-2 px-3 text-gray-300">Descricao</th><th className="text-left py-2 px-3 text-gray-300">IP</th><th className="text-left py-2 px-3 text-gray-300">Data/Hora</th></tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-700">
                    <td className="py-2 px-3 font-medium text-white">{log.username}</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">{log.action}</span></td>
                    <td className="py-2 px-3 text-gray-400">{log.description}</td>
                    <td className="py-2 px-3 font-mono text-xs text-gray-500">{log.ip_address || '-'}</td>
                    <td className="py-2 px-3 text-xs text-gray-400">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
