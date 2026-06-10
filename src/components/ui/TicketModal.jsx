import React, { useState } from 'react';
import { Send, Clock, AlertTriangle, UserPlus, X, Calendar } from 'lucide-react';
import Button from './Button';

export default function TicketModal({ isOpen, onConfirm, onCancel, funcionarios = [], contexto }) {
  const [ticket, setTicket] = useState({
    atribuidoA: '',
    prazo: '',
    prioridade: 'media',
    nota: ''
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3 text-tvde-primary">
            <div className="p-2 bg-blue-50 rounded-xl"><UserPlus size={24} /></div>
            <h3 className="text-xl font-bold text-slate-800">Encaminhar Tarefa</h3>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-6">
          O registo de <strong>{contexto}</strong> foi salvo. Para quem deseja enviar a próxima etapa?
        </p>

        <div className="space-y-4">
          {/* SELEÇÃO DE FUNCIONÁRIO */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Atribuir a:</label>
            <select 
              className="w-full p-3 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-tvde-primary/20 transition-all appearance-none cursor-pointer"
              value={ticket.atribuidoA}
              onChange={(e) => setTicket({...ticket, atribuidoA: e.target.value})}
            >
              <option value="">Selecione um colega...</option>
              {funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome} ({f.role})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* DATA E HORA LIMITE (SISTEMA FLUIDO) */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Prazo de Entrega:</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-tvde-primary transition-colors pointer-events-none">
                  <Clock size={16} />
                </div>
                <input 
                  type="datetime-local" 
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-tvde-primary/20 transition-all cursor-pointer"
                  onChange={(e) => setTicket({...ticket, prazo: e.target.value})}
                />
              </div>
            </div>

            {/* PRIORIDADE */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Urgência:</label>
              <select 
                className="w-full p-3 border border-slate-200 rounded-2xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-tvde-primary/20 transition-all cursor-pointer"
                value={ticket.prioridade}
                onChange={(e) => setTicket({...ticket, prioridade: e.target.value})}
              >
                <option value="baixa">🟢 Baixa</option>
                <option value="media">🟡 Média</option>
                <option value="alta">🔴 Alta / Urgente</option>
              </select>
            </div>
          </div>

          {/* NOTA ADICIONAL */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Instruções:</label>
            <textarea 
              className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 min-h-[100px] text-sm resize-none outline-none focus:ring-2 focus:ring-tvde-primary/20 transition-all"
              placeholder="Ex: Por favor, carregar a foto do registo criminal que falta."
              value={ticket.nota}
              onChange={(e) => setTicket({...ticket, nota: e.target.value})}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <Button variant="secondary" className="flex-1 h-12" onClick={onCancel}>Apenas Salvar</Button>
          <Button 
            className="flex-1 h-12 shadow-lg shadow-blue-500/20" 
            disabled={!ticket.atribuidoA}
            onClick={() => onConfirm(ticket)}
          >
            <Send size={16} /> Enviar Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}