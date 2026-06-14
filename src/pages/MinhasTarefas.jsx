/**
 * MinhasTarefas.jsx
 * Localização: src/pages/MinhasTarefas.jsx
 *
 * Página de tarefas do funcionário.
 * Atualizado com:
 * - Exibição em formato de lista com linhas horizontais (Inbox-style)
 * - Tabela auto-rolável (Horizontal Scroll-Safe) contra quebras no mobile
 */

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { logAcaoGlobal } from '../utils/logger';
import { Inbox, CheckCircle2, Loader2, AlertCircle, UserX, Clock, UserCheck } from 'lucide-react';

export default function MinhasTarefas() {
  const { userData, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTickets = async () => {
    // Se ainda está a carregar o auth, não fazemos nada
    if (authLoading) return;

    // Se o perfil do utilizador não existe no Firestore
    if (!userData?.nome) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ESTA CONSULTA EXIGE UM ÍNDICE NO FIREBASE
      const q = query(
        collection(db, "tickets"),
        where("atribuidoA", "==", userData.nome),
        orderBy("dataCriacao", "desc")
      );
      
      const snap = await getDocs(q);
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
      setError("Não foi possível carregar as tarefas. Verifique se o seu perfil está configurado.");
    } finally {
      setLoading(false);
    }
  };

  // Executa quando o estado de autenticação ou o userData mudar
  useEffect(() => {
    fetchTickets();
  }, [userData, authLoading]);

  const handleComplete = async (id) => {
    try {
      const ticketParaConcluir = tickets.find(t => t.id === id);

      await updateDoc(doc(db, "tickets", id), {
        status: 'concluido',
        dataConclusao: new Date().toISOString()
      });

      await logAcaoGlobal(
        userData?.nome, 
        "Tarefa Concluída", 
        "Workflow", 
        `Finalizou: ${ticketParaConcluir?.vinculoNome || 'Tarefa'}`, 
        id
      );

      fetchTickets();
    } catch (error) { 
      console.error("Erro ao concluir:", error);
      alert("Erro ao concluir tarefa."); 
    }
  };

  // 1. Estado de Carregamento Inicial
  if (authLoading || (loading && tickets.length === 0 && !error && userData?.nome)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-tvde-primary mb-4" size={40} />
        <p className="text-slate-500 font-medium animate-pulse">A procurar as suas tarefas...</p>
      </div>
    );
  }

  // 2. Estado de Erro ou Perfil Incompleto
  if (!userData?.nome) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-6">
          <UserX size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Perfil Não Encontrado</h2>
        <p className="text-slate-500 mt-2 max-w-md text-sm leading-relaxed">
          O seu login foi efetuado, mas não existe um perfil de funcionário associado a este email no sistema. Peça ao Diretor para o registar na <strong>Gestão de Equipa</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Inbox className="text-tvde-primary" /> Minhas Tarefas
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm">Fluxo de trabalho atribuído a <strong>{userData.nome}</strong>.</p>
      </header>

      {error ? (
        <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600">
          <AlertCircle size={24} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : (
        /* ◄ ALTERADO: Lista em formato de linhas horizontais responsivas */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4">Vínculo / Entidade</th>
                <th className="p-4">Instrução / Nota</th>
                <th className="p-4">Atribuído Por</th>
                <th className="p-4">Data</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tickets.length > 0 ? (
                tickets.map(t => {
                  const concluido = t.status === 'concluido';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors text-slate-700">
                      {/* Vínculo / Entidade */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-800 text-white text-[10px] font-mono font-black px-2 py-0.5 rounded shadow-sm shrink-0">
                            {t.vinculoCodigo || 'WF-XXX'}
                          </span>
                          <p className="font-extrabold text-slate-800 text-xs sm:text-sm">{t.vinculoNome || 'Workflow'}</p>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 ml-1">
                          Módulo: {t.modulo || 'Geral'}
                        </p>
                      </td>

                      {/* Instrução / Nota */}
                      <td className="p-4 max-w-[280px] min-w-[150px]">
                        <p className="text-xs text-slate-600 font-medium leading-relaxed break-words">
                          {t.nota || 'Ação necessária no registo.'}
                        </p>
                      </td>

                      {/* Atribuída Por (Remetente) */}
                      <td className="p-4 text-xs font-bold text-slate-500">
                        {t.remetente || 'Sistema'}
                      </td>

                      {/* Data de Criação */}
                      <td className="p-4 text-xs font-semibold text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-300" />
                          {new Date(t.dataCriacao).toLocaleDateString('pt-PT')}
                        </span>
                      </td>

                      {/* Estado do Ticket */}
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          concluido 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-orange-50 text-orange-600 border-orange-100 animate-pulse'
                        }`}>
                          {t.status}
                        </span>
                      </td>

                      {/* Botão transacional de Ação */}
                      <td className="p-4 text-right">
                        {!concluido ? (
                          <button
                            type="button"
                            onClick={() => handleComplete(t.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-sm cursor-pointer hover:shadow-md active:scale-95"
                          >
                            <CheckCircle2 size={13} /> Concluir
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic pr-2 font-medium">Concluída</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <CheckCircle2 className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-slate-400 font-medium">Não tem tarefas pendentes de momento. Bom trabalho!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}