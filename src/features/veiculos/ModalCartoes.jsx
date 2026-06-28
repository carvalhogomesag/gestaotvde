import React from 'react';
import { X, CreditCard } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function ModalCartoes({ isOpen, onClose, cartoesAtribuidos }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
        <h3 className="text-sm font-black text-emerald-700 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none"><CreditCard size={18} className="text-emerald-600" /> Cartões Consumo Vinculados</h3>
        
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {cartoesAtribuidos.length > 0 ? cartoesAtribuidos.map(c => (
              <div key={c.id} className={`flex items-center justify-between p-3.5 rounded-xl border ${c.tipo === 'combustivel' ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
                <div className="text-[11px] font-bold text-slate-700">{c.numero} <span className="opacity-50">({c.fornecedor})</span></div>
                <div className="text-[11px] font-black text-slate-800 bg-white/50 px-2 py-0.5 rounded border border-white font-mono">PIN: {c.pin}</div>
              </div>
            )) : (
              <p className="text-xs text-slate-400 italic p-2 col-span-2 text-center">Nenhum cartão de consumo associado a esta viatura.</p>
            )}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <Button type="button" onClick={onClose} className="px-6 h-10 text-xs shadow-md">Confirmar e Fechar</Button>
        </div>
      </div>
    </div>
  );
}