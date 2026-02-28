import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AlertCircle, Lock, User, Activity } from 'lucide-react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (data.success) onLogin(data.user);
      else setError(data.error || 'Erro ao fazer login');
    } catch (err) {
      setError('Erro de conexao');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Activity className="w-10 h-10 text-blue-500" />
              <h1 className="text-2xl font-bold text-white">LOR CGR</h1>
            </div>
            <p className="text-center text-zinc-400 text-sm">Network Management System</p>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />{error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Digite seu usuario" className="pl-10 bg-zinc-800 border-zinc-700 text-white" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha" className="pl-10 bg-zinc-800 border-zinc-700 text-white" required />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
