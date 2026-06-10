import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { logAcaoGlobal } from '../utils/logger';
import TicketCard from '../features/tickets/TicketCard';
import { Inbox, CheckCircle2, Loader2, AlertCircle, UserX } from 'lucide-react';

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
      // Se o erro for de índice, ele aparecerá aqui na consola do navegador com um link
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
        <p className="text-slate-500 mt-2 max-w-md">
          O seu login foi efetuado, mas não existe um perfil de funcionário associado a este email no sistema. Peça ao Diretor para o registar na <strong>Gestão de Equipa</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Inbox className="text-tvde-primary" /> Minhas Tarefas
        </h1>
        <p className="text-slate-500 text-sm">Fluxo de trabalho atribuído a <strong>{userData.nome}</strong>.</p>
      </header>

      {error ? (
        <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600">
          <AlertCircle size={24} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.length > 0 ? (
            tickets.map(t => (
              <TicketCard key={t.id} ticket={t} onComplete={handleComplete} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <CheckCircle2 className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-slate-400 font-medium">Não tem tarefas pendentes. Bom trabalho!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}