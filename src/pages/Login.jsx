import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Correção efetuada: Redireciona o utilizador para o interior do ERP privado
      navigate('/dashboard'); 
    } catch (err) {
      setError('Email ou palavra-passe incorretos. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-tvde-bg p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="w-20 h-20 bg-tvde-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
            <Lock className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">TVDE Gestão</h2>
          <p className="text-slate-500 mt-2 font-medium">Entre com as suas credenciais</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in zoom-in duration-200">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase ml-2 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-tvde-primary/20 focus:bg-white transition-all"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase ml-2 mb-1">Palavra-passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-tvde-primary/20 focus:bg-white transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg shadow-lg shadow-blue-500/20"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar no Sistema'}
          </Button>
        </form>

        <div className="text-center pt-4">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Gestão TVDE Portugal. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}