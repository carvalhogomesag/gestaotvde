import React from 'react';
import { X, Euro } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function ModalTarifas({ isOpen, onClose, formData, setFormData, isReadOnly }) {
  const inputClass = `w-full py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none transition-all text-xs ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none"><Euro size={18} className="text-purple-600" /> Tarifas & Catálogo Público</h3>
        
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Tarifa Semanal (€)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">€</span>
                <input type="number" placeholder="0.00" readOnly={isReadOnly} className={`${inputClass} pl-6 font-mono font-bold`} value={formData.precoSemanal} onChange={(e) => setFormData({...formData, precoSemanal: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Região de Aluguer</label>
              <select disabled={isReadOnly} className={inputClass} value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})}>
                <option value="Lisboa">Grande Lisboa</option>
                <option value="Porto">Grande Porto</option>
                <option value="Braga">Minho / Braga</option>
                <option value="Algarve">Algarve</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <Button type="button" onClick={onClose} className="px-6 h-10 text-xs shadow-md">Confirmar e Fechar</Button>
        </div>
      </div>
    </div>
  );
}