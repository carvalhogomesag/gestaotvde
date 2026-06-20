/**
 * ProprietarioForm.jsx
 * Localização: src/features/proprietarios/ProprietarioForm.jsx (ajustar conforme a tua pasta)
 *
 * Formulário e ficha cadastral do Proprietário / Parceiro de Frota.
 * 
 * [UX UNIFICADA]:
 * - Migrado integralmente para a arquitetura de grelha de botões táteis com sub-modais de UX.
 * - Histórico de alterações formatado com data e hora detalhadas no padrão PT-PT.
 * - Máscara de telemóvel tátil portuguesa integrada de origem.
 * - Preservação estrita das integrações do Firestore e criação rápida de motorista em linha.
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, Mail, Phone, MapPin, User, Camera, History, 
  Wallet, Plus, Trash2, Euro, CheckCircle2, ChevronDown, ChevronUp, Info, X, ArrowRight, Sparkles, AlertCircle
} from 'lucide-react';
import Button from '../../components/ui/Button';
import DatePicker from '../../components/ui/DatePicker'; 
import { db } from '../../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { logAcaoGlobal } from '../../utils/logger';
import { formatCurrency } from '../../utils/formatters';
import ModalFinanceiro from '../financeiro/ModalFinanceiro';

/**
 * Função Auxiliar: Aplica máscara de telemóvel português (000 000 000)
 */
const formatPhone = (val) => {
  if (!val) return '';
  const clean = val.replace(/\D/g, '').substring(0, 9);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
};

/**
 * Função Auxiliar didática para formatar data e hora em PT-PT
 */
const formatDataHora = (isoString) => {
  if (!isoString) return '';
  try {
    const dataObj = new Date(isoString);
    const data = dataObj.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = dataObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    return `${data} às ${hora}`;
  } catch (e) {
    return isoString;
  }
};

/**
 * Componente Auxiliar: Secção Colapsável Compacta para o Histórico
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

export default function ProprietarioForm({ 
  onSubmit, 
  initialData = {}, 
  onCancel, 
  isReadOnly = false, 
  onCriarMotorista 
}) {
  const { userData } = useAuth();
  
  // ESTADO CENTRAL DO FORMULÁRIO (Telemóvel com máscara inicial de origem)
  const [formData, setFormData] = useState({
    nome: initialData.nome || '', 
    nif: initialData.nif || '', 
    email: initialData.email || '', 
    telemovel: formatPhone(initialData.telemovel || ''), 
    cidade: initialData.cidade || '', 
    morada: initialData.morada || ''
  });

  const [movimentos, setMovimentos] = useState([]);
  const [novoMovimento, setNovoMovimento] = useState({ tipo: 'debito', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] });
  const [criarComoMotorista, setCriarComoMotorista] = useState(false);
  const [modalFinanceiroAberto, setModalFinanceiroAberto] = useState(false);

  // Estados de abertura para os novos sub-modais de UX
  const [modalIdentificacaoAberto, setModalIdentificacaoAberto] = useState(false);
  const [modalContactosAberto, setModalContactosAberto] = useState(false);
  const [modalLocalizacaoAberto, setModalLocalizacaoAberto] = useState(false);
  const [modalContaCorrenteAberto, setModalContaCorrenteAberto] = useState(false);
  const [modalOnboardingAberto, setModalOnboardingAberto] = useState(false);

  // Sincronização em tempo real da conta corrente pendente
  useEffect(() => {
    if (initialData.id) {
      const q = query(
        collection(db, "movimentos_financeiros"), 
        where("entidadeId", "==", initialData.id), 
        where("pagoNoFechoId", "==", "")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => { 
        setMovimentos(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); 
      });
      return () => unsubscribe();
    }
  }, [initialData.id]);

  const handleAddMovimento = async () => {
    if (!novoMovimento.valor || !novoMovimento.descricao) return;
    try {
      const valorNum = parseFloat(novoMovimento.valor);
      const docRef = await addDoc(collection(db, "movimentos_financeiros"), {
        tipoEntidade: 'proprietario', 
        entidadeId: initialData.id, 
        tipoMovimento: novoMovimento.tipo, 
        valor: valorNum,
        descricao: novoMovimento.descricao, 
        dataLancamento: novoMovimento.data, 
        pagoNoFechoId: "", 
        criadoPor: userData.nome, 
        dataCriacao: new Date().toISOString()
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
    
    // Purga de máscaras de telemóvel para consistência na base de dados
    const cleanTelemovel = formData.telemovel.replace(/\D/g, '');
    
    const dadosLimposParaGuardar = {
      ...formData,
      telemovel: cleanTelemovel
    };

    if (criarComoMotorista && onCriarMotorista) {
      await onCriarMotorista({
        nome: formData.nome, 
        nif: formData.nif, 
        telemovel: cleanTelemovel, 
        email: formData.email,
        status: 'Ativo'
      });
    }
    
    if (!isReadOnly) onSubmit(dadosLimposParaGuardar);
  };

  const inputClass = `w-full py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none transition-all text-xs ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-1 max-h-[75vh] overflow-y-auto pr-3.5 custom-scrollbar">
      
      {/* GRELHA DE BOTÕES TÁTEIS DO PROPRIETÁRIO (UX Unificada) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
        
        {/* Botão 1: Identificação & Ficha */}
        <button
          type="button"
          onClick={() => setModalIdentificacaoAberto(true)}
          className="p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
              <Building2 size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Identificação & Ficha</p>
              <p className="text-[9.5px] text-slate-400 truncate">Nome completo, Designação Social e NIF / NIPC.</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {/* Botão 2: Contactos Principais */}
        <button
          type="button"
          onClick={() => setModalContactosAberto(true)}
          className="p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
              <Mail size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Contactos Principais</p>
              <p className="text-[9.5px] text-slate-400 truncate">Telemóvel profissional e Endereço de Email.</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {/* Botão 3: Localização & Morada */}
        <button
          type="button"
          onClick={() => setModalLocalizacaoAberto(true)}
          className="p-2.5 bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
              <MapPin size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Localização & Morada</p>
              <p className="text-[9.5px] text-slate-400 truncate">Cidade e Morada fiscal de faturação.</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {/* Botão 4: Conta Corrente & Lançamentos */}
        {initialData.id && (
          <button
            type="button"
            onClick={() => setModalContaCorrenteAberto(true)}
            className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
                <Wallet size={16} />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-slate-800">Conta Corrente & Ajustes</p>
                <p className="text-[9.5px] text-slate-400 truncate">Débitos, créditos e acertos pendentes semanais.</p>
              </div>
            </div>
            <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
          </button>
        )}

        {/* Botão 5: Opções de Onboarding (Apenas na Criação) */}
        {!initialData.id && (
          <button
            type="button"
            onClick={() => setModalOnboardingAberto(true)}
            className="p-2.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left sm:col-span-2"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
                <User size={16} />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-slate-800">Opções de Onboarding Digital</p>
                <p className="text-[9.5px] text-slate-400 truncate">Ativar criação paralela e simultânea como Motorista.</p>
              </div>
            </div>
            <ArrowRight size={12} className="text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
          </button>
        )}
      </div>

      {/* SEÇÃO DO HISTÓRICO DE EDIÇÕES COM DATA E HORA COMPLETAS (PT-PT) */}
      {initialData.historico && initialData.historico.length > 0 && (
        <CollapsibleSection title="Histórico de Edições" icon={History} iconColor="text-slate-400" defaultOpen={false}>
          <div className="space-y-1.5 text-left">
            {[...initialData.historico].reverse().map((log, index) => (
              <div key={index} className="flex gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[10px]">
                <div className="flex-1">
                  <div className="flex justify-between font-bold text-slate-700 mb-1">
                    <span>👤 {log.usuario}</span>
                    <span className="text-slate-400">📅 {formatDataHora(log.data)}</span>
                  </div>
                  <p className="text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100 mt-1">
                    "{log.descricao}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* SUB-MODAL 1: Identificação & Ficha */}
      {modalIdentificacaoAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalIdentificacaoAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalIdentificacaoAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <Building2 size={18} className="text-blue-500" /> Identificação & Ficha Cadastral
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Nome / Designação Social *</label>
                  <input required readOnly={isReadOnly} className={inputClass} value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">NIF / NIPC</label>
                  <input readOnly={isReadOnly} className={`${inputClass} font-mono`} value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalIdentificacaoAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: Contactos Principais */}
      {modalContactosAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalContactosAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalContactosAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <Mail size={18} className="text-blue-500" /> Contactos Principais
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Profissional</label>
                  <input type="email" readOnly={isReadOnly} className={inputClass} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Telemóvel</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 font-bold text-[10px]">+351</span>
                    <input readOnly={isReadOnly} className={`${inputClass} rounded-l-none font-mono`} value={formData.telemovel} onChange={(e) => setFormData({...formData, telemovel: formatPhone(e.target.value)})} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalContactosAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: Localização & Morada */}
      {modalLocalizacaoAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalLocalizacaoAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalLocalizacaoAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <MapPin size={18} className="text-purple-600" /> Localização & Morada Fiscal
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Morada Completa</label>
                  <input readOnly={isReadOnly} className={inputClass} value={formData.morada} onChange={(e) => setFormData({...formData, morada: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cidade</label>
                  <input readOnly={isReadOnly} className={inputClass} value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalLocalizacaoAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 4: Conta Corrente & Ajustes */}
      {modalContaCorrenteAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalContaCorrenteAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalContaCorrenteAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-indigo-700 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <Wallet size={18} className="text-indigo-600" /> Conta Corrente / Ajustes Semanais
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {!isReadOnly && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <select className={inputClass} value={novoMovimento.tipo} onChange={(e) => setNovoMovimento({...novoMovimento, tipo: e.target.value})}><option value="debito">🔴 Débito</option><option value="credito">🟢 Crédito</option></select>
                  <div className="relative">
                    <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <input type="number" className={`${inputClass} pl-6`} placeholder="0.00" value={novoMovimento.valor} onChange={(e) => setNovoMovimento({...novoMovimento, valor: e.target.value})} />
                  </div>
                  <div className="flex-1">
                    <DatePicker value={novoMovimento.data} onChange={(val) => setNovoMovimento({...novoMovimento, data: val})} />
                  </div>
                  <Button onClick={handleAddMovimento} className="h-[38px] w-full text-xs active:scale-95"><Plus size={14} /> Lançar</Button>
                </div>
              )}
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase"><tr><th className="p-3">Data</th><th className="p-3">Descrição</th><th className="p-3 text-center">Tipo</th><th className="p-3 text-right">Valor</th>{!isReadOnly && <th className="p-3"></th>}</tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {movimentos.length > 0 ? movimentos.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="p-3">{new Date(m.dataLancamento).toLocaleDateString('pt-PT')}</td>
                        <td className="p-3 font-bold text-slate-700">{m.descricao}</td>
                        <td className="p-3 text-center uppercase font-black text-[9px]">{m.tipoMovimento}</td>
                        <td className={`p-3 text-right font-black ${m.tipoMovimento === 'credito' ? 'text-tvde-accent' : 'text-tvde-danger'}`}>{formatCurrency(m.valor)}</td>
                        {!isReadOnly && <td className="p-3 text-right"><button type="button" onClick={() => handleDeleteMovimento(m)} className="text-slate-300 hover:text-red-500 cursor-pointer p-1"><Trash2 size={12} /></button></td>}
                      </tr>
                    )) : <tr><td colSpan="5" className="p-4 text-center text-slate-400 italic">Sem movimentos pendentes.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalContaCorrenteAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 5: Opções de Onboarding (Criar Motorista Paralelo) */}
      {modalOnboardingAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalOnboardingAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalOnboardingAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-emerald-700 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <User size={18} className="text-emerald-600" /> Opções de Onboarding Digital
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setCriarComoMotorista(!criarComoMotorista)} className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${criarComoMotorista ? 'bg-tvde-primary' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${criarComoMotorista ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Este proprietário é também motorista</p>
                    <p className="text-[10px] text-slate-400">Cria automaticamente um perfil de motorista com os mesmos dados na base de dados.</p>
                  </div>
                </label>
                {criarComoMotorista && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2 animate-in fade-in duration-200">
                    <Info size={14} className="text-tvde-primary mt-0.5 flex-shrink-0" />
                    <p className="text-[10.5px] text-slate-600 leading-relaxed">
                      Será criado um perfil de <strong>Motorista</strong> em tempo real com o nome, NIF e contacto deste proprietário assim que clicar em Guardar.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalOnboardingAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÕES FIXOS NO RODAPÉ */}
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