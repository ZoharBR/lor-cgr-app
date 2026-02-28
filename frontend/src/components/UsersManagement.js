import React, { useState, useEffect } from 'react'
import { User, Plus, Edit, Trash2, Search, Download, Shield, CheckCircle, XCircle, FileText, Eye, Terminal } from 'lucide-react'

const ROLE_COLORS = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  noc: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  NOC: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  leitura: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  LEITURA: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

const ROLE_LABELS = {
  admin: 'Admin', ADMIN: 'Admin',
  noc: 'NOC', NOC: 'NOC',
  leitura: 'Leitura', LEITURA: 'Leitura'
}

export default function UsersManagement({ user: currentUser }) {
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [showLogDetail, setShowLogDetail] = useState(false)
  const [formData, setFormData] = useState({ username: '', email: '', password: '', first_name: '', role: 'leitura' })

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/')
      const data = await res.json()
      setUsers(data.data || [])  // CORRIGIDO: era data.users
    } catch (e) { console.error('Erro:', e) }
    setLoading(false)
  }

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/logs/')
      const data = await res.json()
      setLogs(data.data || [])
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
    setFormData({ username: '', email: '', password: '', first_name: '', role: 'leitura' })
    setSelectedUser(null)
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setFormData({ username: user.username, email: user.email || '', password: '', first_name: user.name || '', role: user.role || 'leitura' })
    setShowModal(true)
  }

  const canDelete = currentUser?.role === 'ADMIN' || currentUser?.role === 'admin'

  const filteredUsers = users.filter(u => 
    (u.username || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  )

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
                        <div><div className="font-medium text-white">{user.username}</div><div className="text-xs text-gray-500">{user.name || '-'}</div></div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{user.email || '-'}</td>
                    <td className="py-3 px-4"><span className={'px-2 py-1 rounded text-xs font-medium border ' + (ROLE_COLORS[user.role] || ROLE_COLORS.leitura)}>{ROLE_LABELS[user.role] || 'Leitura'}</span></td>
                    <td className="py-3 px-4">{user.active ? <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle className="w-4 h-4" /> Ativo</span> : <span className="flex items-center gap-1 text-red-400 text-sm"><XCircle className="w-4 h-4" /> Inativo</span>}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEditModal(user)} className="p-2 hover:bg-gray-600 rounded-lg"><Edit className="w-4 h-4 text-gray-400" /></button>
                        {canDelete && user.role !== 'admin' && user.role !== 'ADMIN' && <button onClick={() => handleDelete(user.id)} className="p-2 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>}
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
              <div><label className="block text-sm text-gray-400 mb-1">Nome</label><input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" /></div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nivel de Acesso *</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white">
                  <option value="ADMIN">Admin - Acesso Total</option>
                  <option value="NOC">NOC - Operacional</option>
                  <option value="LEITURA">Leitura - Somente Visualizar</option>
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
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-5xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Logs de Auditoria</h2>
              <div className="flex gap-2">
                <button onClick={exportLogs} className="px-3 py-1 bg-gray-700 rounded text-sm text-gray-300 hover:bg-gray-600"><Download className="w-4 h-4 inline mr-1" /> Exportar</button>
                <button onClick={() => setShowLogsModal(false)} className="text-gray-400 hover:text-white text-xl">X</button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left py-2 px-3 text-gray-300">Data/Hora</th>
                  <th className="text-left py-2 px-3 text-gray-300">Usuario</th>
                  <th className="text-left py-2 px-3 text-gray-300">Acao</th>
                  <th className="text-left py-2 px-3 text-gray-300">Descricao</th>
                  <th className="text-left py-2 px-3 text-gray-300">IP</th>
                  <th className="text-right py-2 px-3 text-gray-300">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="border-t border-gray-700 hover:bg-gray-700/30 cursor-pointer" onClick={() => { setSelectedLog(log); setShowLogDetail(true); }}>
                    <td className="py-2 px-3 text-xs text-gray-400">{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-3 font-medium text-white">{log.user?.name || log.user?.username || 'Sistema'}</td>
                    <td className="py-2 px-3"><span className={'px-2 py-0.5 rounded text-xs ' + (log.action === 'SSH_COMMAND' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400')}>{log.action}</span></td>
                    <td className="py-2 px-3 text-gray-400 max-w-xs truncate">{log.description}</td>
                    <td className="py-2 px-3 font-mono text-xs text-gray-500">{log.ipAddress || '-'}</td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedLog(log); setShowLogDetail(true); }} className="p-1 hover:bg-gray-600 rounded"><Eye className="w-4 h-4 text-blue-400" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showLogDetail && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {selectedLog.action === 'SSH_COMMAND' ? <Terminal className="w-5 h-5 text-yellow-400" /> : <FileText className="w-5 h-5 text-blue-400" />}
                Detalhes do Log
              </h2>
              <button onClick={() => setShowLogDetail(false)} className="text-gray-400 hover:text-white text-xl">X</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-900 p-3 rounded">
                <label className="text-xs text-gray-500">Data/Hora</label>
                <p className="text-white">{new Date(selectedLog.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-gray-900 p-3 rounded">
                <label className="text-xs text-gray-500">Usuario</label>
                <p className="text-white">{selectedLog.user?.name || 'Sistema'} <span className={'text-xs px-2 py-0.5 rounded ' + (ROLE_COLORS[selectedLog.user?.role] || '')}>{selectedLog.user?.role}</span></p>
              </div>
            </div>
            
            <div className="bg-gray-900 p-3 rounded mb-4">
              <label className="text-xs text-gray-500">Acao</label>
              <p className="text-white">{selectedLog.action} - {selectedLog.description}</p>
            </div>
            
            {selectedLog.action === 'SSH_COMMAND' && (
              <div className="border border-yellow-500/30 rounded-lg overflow-hidden mb-4">
                <div className="bg-yellow-500/10 px-4 py-2 flex items-center justify-between border-b border-yellow-500/30">
                  <span className="text-yellow-500 font-medium flex items-center gap-2"><Terminal className="w-4 h-4" /> Sessao SSH</span>
                  <span className={selectedLog.sshSuccess ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>{selectedLog.sshSuccess ? 'Sucesso' : 'Falhou'}</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Dispositivo</label>
                    <p className="bg-gray-950 p-2 rounded text-sm font-mono">{selectedLog.sshDevice || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Comando Executado</label>
                    <pre className="bg-gray-950 p-2 rounded text-sm font-mono text-green-400 overflow-x-auto">{selectedLog.sshCommand || '-'}</pre>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Saida do Terminal</label>
                    <pre className="bg-gray-950 p-3 rounded text-sm font-mono text-gray-300 overflow-x-auto max-h-64 whitespace-pre-wrap">{selectedLog.sshOutput || 'Sem saida'}</pre>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-900 p-3 rounded">
                <label className="text-xs text-gray-500">IP</label>
                <p className="text-white font-mono">{selectedLog.ipAddress || '-'}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLogDetail(false)} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-gray-300">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
