import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 800));
      const success = await onLogin(username, password);
      if (!success) {
        setError('Usuário ou senha incorretos.');
      }
    } catch (err) {
      setError('Erro ao tentar conectar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[100px]"></div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-slate-700 shadow-lg">
             <i className="fas fa-satellite-dish text-primary text-3xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider">LOR CGR</h1>
          <p className="text-slate-400 text-sm mt-2">Network Operations Center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Usuário</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-500"><i className="fas fa-user"></i></span>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Ex: admin"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Senha</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-500"><i className="fas fa-lock"></i></span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-in-alt"></i>}
            {isLoading ? 'Acessando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-600">
          <p>© 2023 LOR CGR Systems. Todos os direitos reservados.</p>
          <p className="mt-1">Versão 1.2.0 (Stable)</p>
        </div>
      </div>
    </div>
  );
};

export default Login;