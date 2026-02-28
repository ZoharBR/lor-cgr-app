import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from './ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from './ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import {
  Eye, Download, Trash2, Search, RefreshCw, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, Info, XCircle, Shield, User, Activity, Terminal
} from 'lucide-react';

const getActionBadge = (action) => {
  const styles = {
    DEVICE_CREATED: { variant: 'default', color: 'bg-green-500/20 text-green-400' },
    DEVICE_UPDATED: { variant: 'secondary', color: 'bg-blue-500/20 text-blue-400' },
    DEVICE_DELETED: { variant: 'destructive', color: 'bg-red-500/20 text-red-400' },
    SSH_COMMAND: { variant: 'outline', color: 'bg-yellow-500/20 text-yellow-400' },
    AI_CHAT: { variant: 'secondary', color: 'bg-purple-500/20 text-purple-400' },
    USER_LOGIN: { variant: 'default', color: 'bg-cyan-500/20 text-cyan-400' },
    USER_LOGOUT: { variant: 'outline', color: 'bg-gray-500/20 text-gray-400' },
    CONFIG_BACKUP: { variant: 'secondary', color: 'bg-indigo-500/20 text-indigo-400' },
    ALERT_CREATED: { variant: 'destructive', color: 'bg-orange-500/20 text-orange-400' },
    USER_CREATED: { variant: 'default', color: 'bg-green-500/20 text-green-400' },
    USER_DELETED: { variant: 'destructive', color: 'bg-red-500/20 text-red-400' },
  };
  return styles[action] || { variant: 'outline', color: 'bg-gray-500/20 text-gray-400' };
};

const getRoleBadge = (role) => {
  const styles = {
    ADMIN: 'bg-red-500/10 text-red-500 border-red-500/20',
    NOC: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    LEITURA: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };
  return styles[role] || 'bg-gray-500/10 text-gray-500';
};

function Logs({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchAction, setSearchAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [users, setUsers] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = user?.role === 'ADMIN';

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (searchAction) params.append('action', searchAction);
      if (filterUser) params.append('userId', filterUser);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/logs/?${params}`, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setLogs(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchAction, filterUser, startDate, endDate]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/', { credentials: 'include' });
      const data = await response.json();
      if (data.success) setUsers(data.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const deleteLog = async () => {
    if (!logToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/logs/${logToDelete.id}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setLogs(logs.filter(l => l.id !== logToDelete.id));
        setTotal(t => t - 1);
        setShowDeleteDialog(false);
        setLogToDelete(null);
      } else {
        alert(data.error || 'Erro ao excluir');
      }
    } catch (err) {
      console.error('Error deleting:', err);
    } finally {
      setDeleting(false);
    }
  };

  const exportLogs = (format) => {
    const params = new URLSearchParams({ format });
    if (searchAction) params.append('action', searchAction);
    if (filterUser) params.append('userId', filterUser);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    window.open(`/api/logs/export/?${params}`, '_blank');
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, [fetchLogs]);

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Logs do Sistema
            <Badge variant="outline" className="text-zinc-400">{total} registros</Badge>
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportLogs('json')} className="border-zinc-700">
            <Download className="w-4 h-4 mr-2" /> JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportLogs('csv')} className="border-zinc-700">
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="border-zinc-700">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar por ação..."
            value={searchAction}
            onChange={(e) => setSearchAction(e.target.value)}
            className="pl-10 bg-zinc-800 border-zinc-700"
          />
        </div>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Filtrar usuário" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="">Todos</SelectItem>
            {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name || u.username}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-zinc-800 border-zinc-700" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-zinc-800 border-zinc-700" />
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" /> Carregando...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Data/Hora</TableHead>
                  <TableHead className="text-zinc-400">Usuário</TableHead>
                  <TableHead className="text-zinc-400">Ação</TableHead>
                  <TableHead className="text-zinc-400">Descrição</TableHead>
                  <TableHead className="text-zinc-400">IP</TableHead>
                  <TableHead className="text-zinc-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">Nenhum log</TableCell></TableRow>
                ) : logs.map(log => {
                  const badge = getActionBadge(log.action);
                  return (
                    <TableRow key={log.id} className="border-zinc-800 hover:bg-zinc-800/50 cursor-pointer" onClick={() => { setSelectedLog(log); setShowDetailModal(true); }}>
                      <TableCell className="font-mono text-sm text-zinc-300">{formatDate(log.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
                            <User className="w-3 h-3" />
                          </div>
                          <div>
                            <span className="text-sm text-white">{log.user?.name || 'Sistema'}</span>
                            <Badge className={`${getRoleBadge(log.user?.role)} text-xs ml-1`}>{log.user?.role || 'NOC'}</Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded font-mono ${badge.color}`}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-zinc-300">{log.description}</TableCell>
                      <TableCell className="font-mono text-xs text-zinc-400">{log.ipAddress || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedLog(log); setShowDetailModal(true); }} title="Ver">
                            <Eye className="w-4 h-4 text-blue-400" />
                          </Button>
                          {canDelete && (
                            <Button variant="ghost" size="sm" onClick={() => { setLogToDelete(log); setShowDeleteDialog(true); }} title="Excluir">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!loading && logs.length > 0 && (
            <div className="flex justify-between items-center p-4 border-t border-zinc-800">
              <span className="text-sm text-zinc-500">Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-zinc-700">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="border-zinc-700">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detalhes */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" /> Detalhes do Log
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 uppercase">ID</label>
                  <p className="font-mono text-sm bg-zinc-800 p-2 rounded">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase">Data/Hora</label>
                  <p className="font-mono text-sm bg-zinc-800 p-2 rounded">{formatDate(selectedLog.createdAt)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 uppercase">Usuário</label>
                  <div className="bg-zinc-800 p-2 rounded flex items-center gap-2">
                    <User className="w-5 h-5 text-zinc-400" />
                    <div>
                      <span className="text-white">{selectedLog.user?.name || 'Sistema'}</span>
                      <br/>
                      <span className="text-xs text-zinc-400">{selectedLog.user?.email}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase">Role</label>
                  <div className="p-2">
                    <Badge className={`${getRoleBadge(selectedLog.user?.role)} text-sm`}>
                      {selectedLog.user?.role || 'NOC'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 uppercase">Ação</label>
                  <p className="mt-1">
                    <span className={`text-sm px-2 py-1 rounded font-mono ${getActionBadge(selectedLog.action).color}`}>
                      {selectedLog.action}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase">Endereço IP</label>
                  <p className="font-mono text-sm bg-zinc-800 p-2 rounded">{selectedLog.ipAddress || '-'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 uppercase">Descrição</label>
                <p className="bg-zinc-800 p-2 rounded text-sm">{selectedLog.description}</p>
              </div>

              {/* SSH Details */}
              {selectedLog.action === 'SSH_COMMAND' && (
                <div className="border border-yellow-500/30 rounded-lg overflow-hidden">
                  <div className="bg-yellow-500/10 px-4 py-2 flex items-center gap-2 border-b border-yellow-500/30">
                    <Terminal className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-500 font-medium">Detalhes SSH</span>
                    {selectedLog.sshSuccess !== undefined && (
                      <Badge className={selectedLog.sshSuccess ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {selectedLog.sshSuccess ? 'Sucesso' : 'Falhou'}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase">Dispositivo</label>
                      <p className="bg-zinc-800 p-2 rounded text-sm font-mono">{selectedLog.sshDevice || '-'}</p>
                    </div>
                    
                    <div>
                      <label className="text-xs text-zinc-500 uppercase">Comando Executado</label>
                      <pre className="bg-zinc-950 p-3 rounded text-sm font-mono text-green-400 overflow-x-auto">
                        {selectedLog.sshCommand || '-'}
                      </pre>
                    </div>
                    
                    <div>
                      <label className="text-xs text-zinc-500 uppercase">Saída do Terminal</label>
                      <pre className="bg-zinc-950 p-3 rounded text-sm font-mono text-zinc-300 overflow-x-auto max-h-64 whitespace-pre-wrap">
                        {selectedLog.sshOutput || 'Sem saída'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-xs text-zinc-500 uppercase">User Agent</label>
                <p className="text-sm bg-zinc-800 p-2 rounded truncate text-zinc-400">{selectedLog.userAgent || '-'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)} className="border-zinc-700">Fechar</Button>
            {selectedLog && canDelete && (
              <Button variant="destructive" onClick={() => { setShowDetailModal(false); setLogToDelete(selectedLog); setShowDeleteDialog(true); }}>
                <Trash2 className="w-4 h-4 mr-2" />Excluir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmação Delete */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" /> Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir este log? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteLog} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Logs;
