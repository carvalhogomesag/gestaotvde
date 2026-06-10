import React, { useState, useEffect } from 'react';
import { 
  Building2, Mail, Phone, MapPin, User, Camera, History, 
  Wallet, Plus, Trash2, Euro, CheckCircle2, ChevronDown, ChevronUp, Info 
} from 'lucide-react';
import Button from '../../components/ui/Button';
import DatePicker from '../../components/ui/DatePicker'; // Novo Import
import { db } from '../../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { logAcaoGlobal } from '../../utils/logger';
import { formatCurrency } from '../../utils/formatters';
import ModalFinanceiro from '../financeiro/ModalFinanceiro';

/**
 * Componente Auxiliar: Secção Colapsável Compacta
 */
const CollapsibleSection = ({ title, icon: Icon, iconColor, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100/50 last:border-0">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between group cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-all py-2">
        <h4 className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-2 ${iconColor}`}><Icon size={14} /> {title}</h4>
        <div className="text-slate-300 group-hover:text-slate-500 transition-colors">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100 mt-2 mb-4' : 'max-h-0 opacity-0'}`}>{children}</div>
    </div>
  );
};

export default function ProprietarioForm({ onSubmit, initialData = {}, onCancel, isReadOnly = false, onCriarMotorista }) {
  const { userData } = useAuth();
  const [formData, setFormData] = useState({
    nome: initialData.nome || '', nif: initialData.nif || '', email: initialData.email || '', telemovel: initialData.telemovel || '', cidade: initialData.cidade || '', morada: initialData.morada || ''
  });

  const [movimentos, setMovimentos] = useState([]);
  const [novoMovimento, setNovoMovimento] = useState({ tipo: 'debito', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] });
  const [criarComoMotorista, setCriarComoMotorista] = useState(false);
  const [modalFinanceiroAberto, setModalFinanceiroAberto] = useState(false);

  useEffect(() => {
    if (initialData.id) {
      const q = query(collection(db, "movimentos_financeiros"), where("entidadeId", "==", initialData.id), where("pagoNoFechoId", "==", ""));
      const unsubscribe = onSnapshot(q, (snapshot) => { setMovimentos(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); });
      return () => unsubscribe();
    }
  }, [initialData.id]);

  const handleAddMovimento = async () => {
    if (!novoMovimento.valor || !novoMovimento.descricao) return;
    try {
      const valorNum = parseFloat(novoMovimento.valor);
      const docRef = await addDoc(collection(db, "movimentos_financeiros"), {
        tipoEntidade: 'proprietario', entidadeId: initialData.id, tipoMovimento: novoMovimento.tipo, valor: valorNum,
        descricao: novoMovimento.descricao, dataLancamento: novoMovimento.data, pagoNoFechoId: "", criadoPor: userData.nome, dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal(userData.nome, "Lançamento Financeiro (Proprietário)", "Conta Corrente", `${novoMovimento.tipo.toUpperCase()}: ${novoMovimento.descricao}`, docRef.id);
      setNovoMovimento({ tipo: 'debito', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] });
    } catch (error) { alert("Erro ao lançar movimento."); }
  };

  const handleDeleteMovimento = async (m) => {
    if (window.confirm("Eliminar este lançamento financeiro?")) {
      await deleteDoc(doc(db, "movimentos_financeiros", m.id));
      await logAcaoGlobal(userData.nome, "Eliminação Financeira", "Conta Corrente", m.descricao, m.id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (criarComoMotorista && onCriarMotorista) {
      await onCriarMotorista({
        nome: formData.nome, nif: formData.nif, iban: formData.iban, telemovel: formData.telemovel, email: formData.email,
      });
    }
    if (!isReadOnly) onSubmit(formData);
  };

  const inputClass = `w-full p-2 border border-slate-200 rounded-xl outline-none transition-all ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-2 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar">
      
      <div className="flex flex-col md:flex-row gap-6 items-center bg-slate-50 p-5 rounded-[2rem] border border-slate-100 mb-4">
        <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center text-tvde-primary shadow-sm border border-slate-100"><Building2 size={32} /></div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          <div className="md:col-span-2"><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Nome / Designação Social *</label><input required readOnly={isReadOnly} className={inputClass} value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} /></div>
          <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">NIF / NIPC</label><input readOnly={isReadOnly} className={`${inputClass} font-mono`} value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value})} /></div>
        </div>
      </div>

      <CollapsibleSection title="Contactos Principais" icon={Mail} iconColor="text-tvde-primary" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-slate-700 mb-1">Email Profissional</label><input type="email" readOnly={isReadOnly} className={inputClass} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
          <div><label className="block text-xs font-medium text-slate-700 mb-1">Telemóvel</label><div className="flex"><span className="inline-flex items-center px-2 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 font-bold text-[10px]">+351</span><input readOnly={isReadOnly} className={`${inputClass} rounded-l-none font-mono`} value={formData.telemovel} onChange={(e) => setFormData({...formData, telemovel: e.target.value.replace(/\D/g, '').substring(0,9)})} /></div></div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Localização e Morada" icon={MapPin} iconColor="text-tvde-primary" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2"><label className="block text-xs font-medium text-slate-700 mb-1">Morada Completa</label><input readOnly={isReadOnly} className={inputClass} value={formData.morada} onChange={(e) => setFormData({...formData, morada: e.target.value})} /></div>
          <div><label className="block text-xs font-medium text-slate-700 mb-1">Cidade</label><input readOnly={isReadOnly} className={inputClass} value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} /></div>
        </div>
      </CollapsibleSection>

      {initialData.id && (
        <CollapsibleSection title="Conta Corrente / Ajustes Semanais" icon={Wallet} iconColor="text-tvde-primary" defaultOpen={false}>
          <div className="space-y-3">
            {!isReadOnly && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                <select className={inputClass} value={novoMovimento.tipo} onChange={(e) => setNovoMovimento({...novoMovimento, tipo: e.target.value})}><option value="debito">🔴 Débito</option><option value="credito">🟢 Crédito</option></select>
                <div className="relative">
                  <Euro className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input type="number" className={`${inputClass} pl-6`} placeholder="0.00" value={novoMovimento.valor} onChange={(e) => setNovoMovimento({...novoMovimento, valor: e.target.value})} />
                </div>
                <div className="flex-1">
                  <DatePicker value={novoMovimento.data} onChange={(val) => setNovoMovimento({...novoMovimento, data: val})} />
                </div>
                <Button onClick={handleAddMovimento} className="h-[38px] w-full text-xs active:scale-95"><Plus size={14} /> Lançar</Button>
              </div>
            )}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase"><tr><th className="p-2">Data</th><th className="p-2">Descrição</th><th className="p-2 text-center">Tipo</th><th className="p-2 text-right">Valor</th>{!isReadOnly && <th className="p-2"></th>}</tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {movimentos.length > 0 ? movimentos.map(m => (
                    <tr key={m.id}><td className="p-2">{new Date(m.dataLancamento).toLocaleDateString('pt-PT')}</td><td className="p-2 font-bold">{m.descricao}</td><td className="p-2 text-center uppercase font-black text-[8px]">{m.tipoMovimento}</td><td className={`p-2 text-right font-black ${m.tipoMovimento === 'credito' ? 'text-tvde-accent' : 'text-tvde-danger'}`}>{formatCurrency(m.valor)}</td>{!isReadOnly && <td className="p-2 text-right"><button type="button" onClick={() => handleDeleteMovimento(m)} className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button></td>}</tr>
                  )) : <tr><td colSpan="5" className="p-4 text-center text-slate-400 italic">Sem movimentos pendentes.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {initialData.historico && initialData.historico.length > 0 && (
        <CollapsibleSection title="Histórico de Alterações" icon={History} iconColor="text-slate-400" defaultOpen={false}>
          <div className="space-y-2">{[...initialData.historico].reverse().map((log, index) => (<div key={index} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px]"><div className="flex-1"><div className="flex justify-between font-bold text-slate-700 mb-1"><span>{log.usuario}</span><span>{new Date(log.data).toLocaleDateString('pt-PT')}</span></div><p className="text-slate-500 italic">"{log.descricao}"</p></div></div>))}</div>
        </CollapsibleSection>
      )}

      {!initialData.id && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setCriarComoMotorista(!criarComoMotorista)} className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${criarComoMotorista ? 'bg-tvde-primary' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${criarComoMotorista ? 'translate-x-4' : 'translate-x-0'}`} /></div>
            <div><p className="text-sm font-bold text-slate-700">Este proprietário é também motorista</p><p className="text-xs text-slate-400">Cria automaticamente um perfil de motorista com os mesmos dados</p></div>
          </label>
          {criarComoMotorista && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2"><Info size={14} className="text-tvde-primary mt-0.5 flex-shrink-0" /><p className="text-xs text-slate-600">Será criado um perfil de <strong>Motorista</strong> com o nome, NIF, IBAN e contacto deste proprietário.</p></div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-6 sticky bottom-0 bg-white pt-4 border-t border-slate-50">
        <Button variant="secondary" className="flex-1 h-10 text-xs" onClick={onCancel}>{isReadOnly ? 'Fechar' : 'Cancelar'}</Button>
        {initialData.id && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-10 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            onClick={() => setModalFinanceiroAberto(true)}
          >
            💰 Gestão Financeira
          </Button>
        )}
        {!isReadOnly && <Button type="submit" className="flex-1 h-10 text-xs shadow-md">Guardar Proprietário</Button>}
      </div>

      <ModalFinanceiro
        isOpen={modalFinanceiroAberto}
        onClose={() => setModalFinanceiroAberto(false)}
        entidadeId={initialData.id}
        tipoEntidade="proprietario"
        nomeEntidade={formData.nome || initialData.nome || 'Proprietário'}
      />
    </form>
  );
}