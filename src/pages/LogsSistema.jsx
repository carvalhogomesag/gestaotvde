import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, User, Clock, FileText, Trash2, Plus, Edit, Lock, Loader2 } from 'lucide-react';

export default function LogsSistema() {
  const { userData } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Busca os últimos 100 logs para não sobrecarregar a página
      const q = query(
        collection(db, "logs_sistema"),
        orderBy("data", "desc"),
        limit(100)
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.role === 'admin') fetchLogs();
  }, [userData]);

  // Função para ícones de ação
  const getActionIcon = (acao) => {
    switch (acao) {
      case 'Criação': return <Plus size={14} className="text-green-500" />;
      case 'Edição': return <Edit size={14} className="text-blue-500" />;
      case 'Eliminação': return <Trash2 size={14} className="text-red-500" />;
      default: return <FileText size={14} />;
    }
  };

  if (userData?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4"><Lock size={40} /></div>
        <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito ao Diretor</h2>
        <p className="text-slate-500">Esta área contém registos de auditoria confidenciais.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <ShieldAlert className="text-red-600" /> Auditoria Global
          </h1>
          <p className="text-slate-500 text-sm">Histórico completo de atividades do sistema (Caixa Preta).</p>
        </div>
        <button onClick={fetchLogs} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
          <Clock size={20} className="text-slate-400" />
        </button>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
              <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Utilizador</th>
              <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Ação</th>
              <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Módulo</th>
              <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Item Afetado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan="5" className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="p-5 text-sm font-medium text-slate-500">
                  {new Date(log.data).toLocaleString('pt-PT')}
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                      {log.usuario?.[0]}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{log.usuario}</span>
                  </div>
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-2">
                    {getActionIcon(log.acao)}
                    <span className={`text-xs font-black uppercase ${
                      log.acao === 'Eliminação' ? 'text-red-600' : 'text-slate-600'
                    }`}>{log.acao}</span>
                  </div>
                </td>
                <td className="p-5 text-sm text-slate-500 font-medium">{log.modulo}</td>
                <td className="p-5">
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded-lg font-bold text-slate-600">
                    {log.itemNome}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && logs.length === 0 && (
          <div className="p-20 text-center text-slate-400 italic">Nenhum registo de atividade encontrado.</div>
        )}
      </div>
    </div>
  );
}