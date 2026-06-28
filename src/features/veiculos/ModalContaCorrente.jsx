/**
 * ModalContaCorrente.jsx
 * Localização: src/features/veiculos/ModalContaCorrente.jsx
 *
 * Sub-modal de Conta Corrente e Ajustes do Veículo.
 * Otimizado com exportação explícita no rodapé para compatibilidade com compiladores de produção.
 */

import React, { useState } from 'react';
import { X, Wallet, Euro, Plus, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { logAcaoGlobal } from '../../utils/logger';
import { formatCurrency } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import DatePicker from '../../components/ui/DatePicker';

function ModalContaCorrente({ 
  isOpen, 
  onClose, 
  formData, 
  isReadOnly, 
  movimentos, 
  setMovimentos, 
  userData, 
  initialData 
}) {
  const inputClass = `w-full py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none transition-all text-xs ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;
  const [novoMovimento, setNovoMovimento] = useState({ tipo: 'debito', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] });

  const handleAddMovimento = async () => {
    if (!novoMovimento.valor || !novoMovimento.descricao) return;
    try {
      const valorNum = parseFloat(novoMovimento.valor);
      const docRef = await addDoc(collection(db, "movimentos_financeiros"), {
        tipoEntidade: 'veiculo', 
        entidadeId: initialData.id, 
        tipoMovimento: novoMovimento.tipo, 
        valor: valorNum,
        descricao: novoMovimento.descricao, 
        dataLancamento: novoMovimento.data, 
        pagoNoFechoId: "", 
        criadoPor: userData.nome, 
        dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal(userData.nome, "Lançamento Financeiro (Veículo)", "Conta Corrente", `${novoMovimento.tipo.toUpperCase()}: ${novoMovimento.descricao}`, docRef.id);
      setNovoMovimento({ tipo: 'debito', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] });
    } catch (error) { 
      console.error("Erro ao lançar movimento:", error); 
    }
  };

  const handleDeleteMovimento = async (m) => {
    if (window.confirm("Eliminar este lançamento financeiro?")) {
      await deleteDoc(doc(db, "movimentos_financeiros", m.id));
      await logAcaoGlobal(userData.nome, "Eliminação Financeira", "Conta Corrente", m.descricao, m.id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
        <h3 className="text-sm font-black text-indigo-700 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none"><Wallet size={18} className="text-indigo-600" /> Conta Corrente / Ajustes da Viatura</h3>
        
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {!isReadOnly && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-100 select-none">
              <div className="md:col-span-1">
                <select className={inputClass} value={novoMovimento.tipo} onChange={(e) => setNovoMovimento({...novoMovimento, tipo: e.target.value})}>
                  <option value="debito">🔴 Débito</option>
                  <option value="credito">🟢 Crédito</option>
                </select>
              </div>
              <div className="md:col-span-1 relative">
                <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input type="number" className={`${inputClass} pl-6 font-mono`} placeholder="0.00" value={novoMovimento.valor} onChange={(e) => setNovoMovimento({...novoMovimento, valor: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <input className={inputClass} placeholder="Descrição do motivo..." value={novoMovimento.descricao} onChange={(e) => setNovoMovimento({...novoMovimento, descricao: e.target.value})} />
              </div>
              <div className="md:col-span-1">
                <DatePicker value={novoMovimento.data} onChange={(val) => setNovoMovimento({...novoMovimento, data: val})} />
              </div>
              <div className="md:col-span-1">
                <Button onClick={handleAddMovimento} className="h-[38px] w-full text-xs active:scale-95"><Plus size={14} /> Lançar</Button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 text-center">Tipo</th>
                  <th className="p-3 text-right">Valor</th>
                  {!isReadOnly && <th className="p-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movimentos.length > 0 ? movimentos.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="p-3">{new Date(m.dataLancamento).toLocaleDateString('pt-PT')}</td>
                    <td className="p-3 font-bold text-slate-700">{m.descricao}</td>
                    <td className="p-3 text-center uppercase font-black text-[9px]">{m.tipoMovimento}</td>
                    <td className={`p-3 text-right font-black ${m.tipoMovimento === 'credito' ? 'text-tvde-accent' : 'text-tvde-danger'}`}>{formatCurrency(m.valor)}</td>
                    {!isReadOnly && <td className="p-3 text-right"><button type="button" onClick={() => handleDeleteMovimento(m)} className="text-slate-300 hover:text-red-500 cursor-pointer p-1"><Trash2 size={12} /></button></td>}
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="p-4 text-center text-slate-400 italic">Sem movimentos registados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end shrink-0">
          <Button type="button" onClick={onClose} className="px-6 h-10 text-xs shadow-md">Confirmar e Fechar</Button>
        </div>
      </div>
    </div>
  );
}

export default ModalContaCorrente;