import React from 'react';
import { Clock, AlertCircle, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TicketCard({ ticket, onComplete }) {
  const navigate = useNavigate();
  const hoje = new Date();
  const prazo = new Date(ticket.prazo);
  const diffHoras = (prazo - hoje) / (1000 * 60 * 60);

  const getUrgencyStyles = () => {
    if (ticket.status === 'concluido') return 'border-green-100 bg-green-50 text-green-600';
    if (diffHoras < 0) return 'border-red-200 bg-red-50 text-red-600 animate-pulse'; 
    if (diffHoras < 24 || ticket.prioridade === 'alta') return 'border-orange-200 bg-orange-50 text-orange-600'; 
    return 'border-blue-100 bg-blue-50 text-blue-600'; 
  };

  // Função para navegar até ao registo específico
  const handleGoToRecord = () => {
    if (ticket.status === 'concluido') return;
    
    // Determina a rota baseada no módulo
    let path = `/${ticket.modulo}`;
    if (ticket.modulo === 'cartoes') {
      path = ticket.tipo === 'eletrico' ? '/cartoes/carregamento' : '/cartoes/abastecimento';
    }

    // Navega passando o ID do item para abrir o modal automaticamente
    navigate(`${path}?id=${ticket.vinculoId}`);
  };

  return (
    <div className={`p-5 rounded-[2.5rem] border-2 transition-all shadow-sm hover:shadow-md group cursor-default ${getUrgencyStyles()}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          {diffHoras < 0 ? <AlertCircle size={20} /> : <Clock size={20} />}
          <span className="text-[10px] font-black uppercase tracking-widest">
            {ticket.status === 'concluido' ? 'Tarefa Concluída' : `Prazo: ${prazo.toLocaleString('pt-PT')}`}
          </span>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${getUrgencyStyles()}`}>
          {ticket.prioridade}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <h4 className="font-bold text-slate-800 text-lg leading-tight">{ticket.vinculoNome}</h4>
          {ticket.status !== 'concluido' && (
            <button 
              onClick={handleGoToRecord}
              className="p-2 bg-white text-tvde-primary rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
              title="Executar Ação"
            >
              <ExternalLink size={16} />
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 font-medium bg-white/60 p-3 rounded-2xl border border-white/50 italic">
          "{ticket.nota || "Sem instruções adicionais."}"
        </p>
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm border border-slate-100">
            {ticket.remetente?.[0]}
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">De: {ticket.remetente}</span>
        </div>
        
        {ticket.status !== 'concluido' && (
          <button 
            onClick={() => onComplete(ticket.id)}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-700 transition-all active:scale-95"
          >
            <CheckCircle2 size={14} /> Concluir
          </button>
        )}
      </div>
    </div>
  );
}