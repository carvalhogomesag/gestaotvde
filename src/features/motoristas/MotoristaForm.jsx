import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import FileUpload from '../../components/ui/FileUpload';
import DatePicker from '../../components/ui/DatePicker';
import { 
  User, Mail, CreditCard, BadgeCheck, MapPin, 
  CheckSquare, Square, Camera, Eye, Trash2, 
  CheckCircle2, AlertCircle, History, Wallet, Plus, Minus, 
  Euro, ChevronDown, ChevronUp, FileCheck, Image as ImageIcon, Info,
  MessageSquare, Share2, Send, Sparkles, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc, addDoc, collection, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
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

export default function MotoristaForm({ onSubmit, initialData = {}, onCancel, isReadOnly = false, onCriarProprietario }) {
  const { userData } = useAuth();
  
  // ESTADO DO FORMULÁRIO
  const [formData, setFormData] = useState({
    nome: initialData.nome || '', email: initialData.email || '', telemovel: initialData.telemovel || '', nif: initialData.nif || '',
    nifPagamento: initialData.nifPagamento || '', nifMesmoMotorista: initialData.nifMesmoMotorista || false, 
    numID: initialData.numID || '', numCarta: initialData.numCarta || '', 
    numTVDE: initialData.numTVDE || '', dataNascimento: initialData.dataNascimento || '', iban: initialData.iban || '',
    moradaTipo: initialData.moradaTipo || '', moradaRua: initialData.moradaRua || '', moradaNumero: initialData.moradaNumero || '',
    moradaComplemento: initialData.moradaComplemento || '', codigoPostal: initialData.codigoPostal || '', localidade: initialData.localidade || '',
    status: initialData.status || 'Ativo', fotoPerfil: initialData.fotoPerfil || '', docIDFront: initialData.docIDFront || '',
    docIDBack: initialData.docIDBack || '', docCartaFront: initialData.docCartaFront || '', docCartaBack: initialData.docCartaBack || '',
    docCertificadoTVDE: initialData.docCertificadoTVDE || '', docRegistoCriminal: initialData.docRegistoCriminal || '',
    docIBAN: initialData.docIBAN || '', docMorada: initialData.docMorada || '', validadeID: initialData.validadeID || '',
    validadeCarta: initialData.validadeCarta || '', validadeTVDE: initialData.validadeTVDE || '', validadeCriminal: initialData.validadeCriminal || '',
    observacoes_ia: initialData.observacoes_ia || '',
    alerta_inconsistencia: initialData.alerta_inconsistencia || false,
    motivo_inconsistencia: initialData.motivo_inconsistencia || ''
  });

  const [movimentos, setMovimentos] = useState([]);
  const [novoMovimento, setNovoMovimento] = useState({ tipo: 'debito', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] });
  const [criarComoProprietario, setCriarComoProprietario] = useState(false);
  const [modalFinanceiroAberto, setModalFinanceiroAberto] = useState(false);

  // 🟢 CORREÇÃO: Adicionado o vínculo do campo IBAN ao seu respetivo documento de origem para auditoria visual
  const fieldToDocMap = {
    nome: formData.docIDFront,
    dataNascimento: formData.docIDFront,
    numID: formData.docIDFront,
    validadeID: formData.docIDFront,
    nif: formData.docIDBack,
    moradaRua: formData.docIDBack,
    codigoPostal: formData.docIDBack,
    localidade: formData.docIDBack,
    numCarta: formData.docCartaFront,
    validadeCarta: formData.docCartaBack,
    numTVDE: formData.docCertificadoTVDE,
    validadeTVDE: formData.docCertificadoTVDE,
    validadeCriminal: formData.docRegistoCriminal,
    iban: formData.docIBAN
  };

  const abrirDocumentoPopup = (url) => {
    if (!url) return;
    const width = 800;
    const height = 900;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    window.open(url, 'Visualização', `width=${width},height=${height},top=${top},left=${left},menubar=no,status=no`);
  };

  useEffect(() => {
    if (!initialData || Object.keys(initialData).length === 0) return;
    const camposIA = {};
    Object.keys(initialData).forEach(key => {
      if (key.startsWith('ai_filled_') && initialData[key] === true) {
        const campoReal = key.replace('ai_filled_', '');
        if (initialData[campoReal] !== undefined) camposIA[campoReal] = initialData[campoReal];
      }
    });
    const camposDoc = ['docIDFront', 'docIDBack', 'docCartaFront', 'docCartaBack', 'docCertificadoTVDE', 'docRegistoCriminal', 'docIBAN', 'docMorada', 'fotoPerfil'];
    camposDoc.forEach(campo => { if (initialData[campo]) camposIA[campo] = initialData[campo]; });
    
    setFormData(prev => ({ 
      ...prev, 
      ...initialData, 
      ...camposIA, 
      observacoes_ia: initialData.observacoes_ia || prev.observacoes_ia,
      alerta_inconsistencia: initialData.alerta_inconsistencia || prev.alerta_inconsistencia,
      motivo_inconsistencia: initialData.motivo_inconsistencia || prev.motivo_inconsistencia
    }));
  }, [initialData]);

  useEffect(() => {
    if (initialData.id) {
      const q = query(
        collection(db, "movimentos_financeiros"), 
        where("entidadeId", "==", initialData.id), 
        where("pagoNoFechoId", "==", "")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => { setMovimentos(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); });
      return () => unsubscribe();
    }
  }, [initialData.id]);

  useEffect(() => { if (formData.nifMesmoMotorista) { setFormData(prev => ({ ...prev, nifPagamento: prev.nif })); } }, [formData.nif, formData.nifMesmoMotorista]);

  const validarCampoIA = async (campo) => {
    const motoristaId = initialData.id || formData.id;
    if (!motoristaId) return;
    try {
      const motoristaRef = doc(db, "motoristas", motoristaId);
      await updateDoc(motoristaRef, { [`ai_filled_${campo}`]: false });
    } catch (error) {
      console.error("Erro ao validar campo:", error);
    }
  };

  const handleAddMovimento = async () => {
    if (!novoMovimento.valor || !novoMovimento.descricao) {
      alert("Por favor, preencha o valor e a descrição do lançamento.");
      return;
    }
    try {
      const valorNum = parseFloat(novoMovimento.valor);
      const docRef = await addDoc(collection(db, "movimentos_financeiros"), {
        tipoEntidade: 'motorista', 
        entidadeId: initialData.id, 
        tipoMovimento: novoMovimento.tipo, 
        valor: valorNum,
        descricao: novoMovimento.descricao, 
        dataLancamento: novoMovimento.data, 
        pagoNoFechoId: "", 
        criadoPor: userData.nome, 
        dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal(userData.nome, "Lançamento Financeiro", "Conta Corrente", `${novoMovimento.tipo.toUpperCase()}: ${novoMovimento.descricao}`, docRef.id);
      setNovoMovimento({ tipo: 'debito', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] });
    } catch (error) { alert("Erro ao lançar movimento."); }
  };

  const handleDeleteMovimento = async (m) => {
    if (window.confirm("Eliminar este lançamento financeiro?")) {
      await deleteDoc(doc(db, "movimentos_financeiros", m.id));
      await logAcaoGlobal(userData.nome, "Eliminação Financeira", "Conta Corrente", m.descricao, m.id);
    }
  };

  const handleEnviarLinkExistente = (metodo) => {
    const onboardingUrl = `${window.location.origin}/onboarding/${initialData.id}`;
    const mensagem = `Olá ${formData.nome}, utilize este link para carregar os seus documentos: ${onboardingUrl}`;
    if (metodo === 'whatsapp') {
      window.open(`https://wa.me/351${formData.telemovel}?text=${encodeURIComponent(mensagem)}`, '_blank');
    } else if (metodo === 'email') {
      window.location.href = `mailto:${formData.email}?subject=Registo de Motorista - Documentação&body=${encodeURIComponent(mensagem)}`;
    }
    logAcaoGlobal(userData.nome, "Reenvio de Link Onboarding", "Motoristas", formData.nome, initialData.id);
  };

  const handleRemoveFile = (field) => { if (window.confirm("Deseja remover este documento?")) { setFormData(prev => ({ ...prev, [field]: '' })); } };

  const inputClass = `w-full p-2 border border-slate-200 rounded-xl outline-none transition-all ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;

  // 🟢 OTIMIZAÇÃO: Suporte a parâmetro forceReadOnly para bloquear campos autogeridos (ex: nif repetido)
  const renderInputIA = (label, field, required = false, forceReadOnly = false) => {
    const isAIFilled = initialData[`ai_filled_${field}`];
    const docUrl = fieldToDocMap[field];

    return (
      <div className="relative group">
        <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1 flex justify-between items-center">
          <span>{label} {required && '*'}</span>
          {isAIFilled && <span className="text-blue-500 flex items-center gap-1 animate-pulse"><Sparkles size={10} /> IA</span>}
        </label>
        <div className="relative flex items-center">
          <input 
            required={required} readOnly={isReadOnly || forceReadOnly} 
            className={`${inputClass} ${isAIFilled ? 'border-blue-300 bg-blue-50/30 ring-2 ring-blue-100 pr-16' : ''} ${forceReadOnly ? 'bg-slate-100 text-slate-400 font-medium cursor-not-allowed' : ''}`} 
            value={formData[field] || ''} 
            onChange={(e) => {
              setFormData({...formData, [field]: e.target.value});
              if (isAIFilled) validarCampoIA(field);
            }} 
          />
          
          <div className="absolute right-2 flex items-center gap-1">
            {docUrl && (
              <button type="button" onClick={() => abrirDocumentoPopup(docUrl)} className="p-1.5 text-slate-400 hover:text-tvde-primary hover:bg-blue-50 rounded-lg transition-all" title="Ver documento de origem">
                <Eye size={14} />
              </button>
            )}
            {isAIFilled && !isReadOnly && (
              <button type="button" onClick={() => validarCampoIA(field)} className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm transition-all" title="Confirmar dado lido pela IA">
                <ShieldCheck size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const DocumentSlot = ({ label, fileUrl, uploadField, folder }) => {
    const hasFile = !!fileUrl;
    const isAIFilled = initialData[`ai_filled_${uploadField}`];
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-1 px-1">
          <span className={`text-[9px] font-black uppercase ${isAIFilled ? 'text-blue-500' : 'text-slate-400'}`}>{label} {isAIFilled && '(IA)'}</span>
          {hasFile && (
            <div className="flex gap-1">
              <button type="button" onClick={() => abrirDocumentoPopup(fileUrl)} className="text-tvde-primary hover:text-blue-700"><Eye size={12} /></button>
              {!isReadOnly && <button type="button" onClick={() => handleRemoveFile(uploadField)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>}
            </div>
          )}
        </div>
        <div className={`relative h-24 rounded-xl border-2 flex items-center justify-center overflow-hidden transition-all ${hasFile ? (isAIFilled ? 'border-blue-300 bg-blue-50/20' : 'border-slate-200 bg-white') : 'border-dashed border-slate-200 bg-slate-50'}`}>
          {!hasFile ? (
            !isReadOnly && <FileUpload label="Carregar" folder={folder} onUploadComplete={(url) => setFormData(prev => ({...prev, [uploadField]: url}))} />
          ) : (
            <>
              {fileUrl.includes('alt=media') || fileUrl.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
                <img src={fileUrl} className="w-full h-full object-cover opacity-40" alt="" />
              ) : (
                <FileCheck size={24} className="text-slate-300" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  type="button"
                  onClick={() => isAIFilled && !isReadOnly && validarCampoIA(uploadField)}
                  className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase shadow-sm border flex items-center gap-1 transition-all active:scale-95 ${
                    isAIFilled 
                    ? 'bg-blue-500 text-white border-blue-400 hover:bg-blue-600 cursor-pointer' 
                    : 'bg-white/90 text-slate-800 border-slate-100'
                  }`}
                >
                  {isAIFilled ? <Sparkles size={10} /> : <CheckCircle2 size={10} className="text-green-500" />} 
                  {isAIFilled ? 'Validar' : 'Pronto'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const DocumentCard = ({ title, slots, dateField, infoIA }) => (
    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full relative">
      <div className="flex items-center gap-2 mb-3 border-b border-slate-50 pb-2">
        <div className="p-1.5 bg-blue-50 text-tvde-primary rounded-lg"><ImageIcon size={14} /></div>
        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{title}</span>
      </div>
      <div className="flex gap-3 mb-3">{slots.map((slot, i) => <DocumentSlot key={i} {...slot} />)}</div>
      {dateField && (
        <div className="mt-auto pt-2 border-t border-slate-50">
          <div className="flex justify-between items-end gap-2">
            <div className="flex-1">
              <DatePicker 
                label="Validade" 
                value={formData[dateField]} 
                onChange={(val) => {
                  setFormData(prev => ({...prev, [dateField]: val}));
                  if (initialData[`ai_filled_${dateField}`]) validarCampoIA(dateField);
                }} 
                isReadOnly={isReadOnly} 
              />
            </div>
            {infoIA && initialData[`ai_filled_${dateField}`] && (
              <div className="mb-2 p-1.5 bg-blue-50 text-blue-600 rounded-lg" title={infoIA}>
                <Sparkles size={14} className="animate-pulse" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const handleFinalSubmit = async (enviarLink = false) => {
    if (!formData.nome || !formData.telemovel || !formData.email) { alert("Preencha Nome, Telemóvel e Email."); return; }
    if (criarComoProprietario && onCriarProprietario) { await onCriarProprietario({ nome: formData.nome, nif: formData.nif, iban: formData.iban, telemovel: formData.telemovel, email: formData.email }); }
    onSubmit(formData, enviarLink);
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-1 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar">
      {initialData.id && !isReadOnly && (
        <div className="bg-blue-600 p-5 rounded-[2.5rem] mb-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-blue-400">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Share2 size={24} /></div>
            <div><p className="text-sm font-bold">Onboarding Digital</p><p className="text-[10px] opacity-80 uppercase font-black tracking-widest">Reenviar link para o motorista.</p></div>
          </div>
          <button type="button" onClick={() => handleEnviarLinkExistente('whatsapp')} className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg"><MessageSquare size={18} /> WhatsApp</button>
        </div>
      )}

      {/* BLOCO DE ALERTAS IA (REVISÃO E INCONSISTÊNCIA) */}
      {(Object.keys(initialData).some(k => k.startsWith('ai_filled_') && initialData[k] === true) || formData.alerta_inconsistencia) && (
        <div className="space-y-3 mb-4">
          {/* Alerta de Inconsistência (Crítico) */}
          {formData.alerta_inconsistencia && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3 text-orange-600">
                <AlertTriangle size={20} className="animate-pulse mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-tight">Alerta de Inconsistência!</p>
                  <p className="text-[10px] bg-white/50 p-2 rounded-lg mt-2 border border-orange-100 italic">
                    {formData.motivo_inconsistencia || "A IA detetou dados divergentes entre os documentos carregados."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Aviso de Preenchimento Automático */}
          {Object.keys(initialData).some(k => k.startsWith('ai_filled_') && initialData[k] === true) && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3 text-blue-600">
                <Sparkles size={20} className="animate-pulse mt-0.5" />
                <div>
                  <p className="text-xs font-bold">A IA preencheu dados automaticamente!</p>
                  {formData.observacoes_ia && <p className="text-[10px] bg-white/50 p-2 rounded-lg mt-2 border border-blue-100 italic"><strong>Nota da IA:</strong> {formData.observacoes_ia}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 items-center bg-slate-50 p-5 rounded-[2rem] border border-slate-100 mb-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white flex items-center justify-center">{formData.fotoPerfil ? <img src={formData.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" /> : <User size={32} className="text-slate-200" />}</div>
          {!isReadOnly && <FileUpload mode="minimal" label={<div className="p-1.5 bg-tvde-primary text-white rounded-full shadow-md cursor-pointer border-2 border-white"><Camera size={12}/></div>} folder="motoristas/fotos" onUploadComplete={(url) => setFormData({...formData, fotoPerfil: url})} />}
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          <div className="md:col-span-3">{renderInputIA("Nome Completo", "nome", true)}</div>
          <div><DatePicker label="Nascimento" value={formData.dataNascimento} onChange={(val) => { setFormData({...formData, dataNascimento: val}); if (initialData.ai_filled_dataNascimento) validarCampoIA('dataNascimento'); }} isReadOnly={isReadOnly} /></div>
          <div>{renderInputIA("NIF", "nif")}</div>
          <div>{renderInputIA("ID Documento", "numID")}</div>
          <div>{renderInputIA("Nº Carta Condução", "numCarta")}</div>
          <div>{renderInputIA("Cért. TVDE", "numTVDE")}</div>
        </div>
      </div>

      <CollapsibleSection title="Contacto e Morada" icon={MapPin} iconColor="text-tvde-primary" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-slate-700 mb-1">Email *</label><input type="email" required readOnly={isReadOnly} className={inputClass} value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
          <div><label className="block text-xs font-medium text-slate-700 mb-1">Telemóvel *</label><div className="flex"><span className="inline-flex items-center px-2 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 font-bold text-[10px]">+351</span><input required readOnly={isReadOnly} className={`${inputClass} rounded-l-none font-mono`} value={formData.telemovel || ''} onChange={(e) => setFormData({...formData, telemovel: e.target.value.replace(/\D/g, '').substring(0,9)})} /></div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <div className="md:col-span-2">{renderInputIA("Rua / Avenida", "moradaRua")}</div>
          <div>{renderInputIA("Cód. Postal", "codigoPostal")}</div>
          <div>{renderInputIA("Localidade", "localidade")}</div>
        </div>
      </CollapsibleSection>

      {/* 🟢 REINSERIDA & CORRIGIDA: SECÇÃO DE METADADOS FINANCEIROS, FATURAÇÃO E CONFIGURAÇÃO DE PAYOUT */}
      <CollapsibleSection title="Dados Financeiros e Faturação" icon={Wallet} iconColor="text-tvde-primary" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100 items-end">
          <div className="md:col-span-1">
            {renderInputIA("IBAN para Recebimentos", "iban", true)}
          </div>
          <div className="md:col-span-1 flex items-center h-[38px] pb-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
              <input 
                type="checkbox" 
                disabled={isReadOnly}
                checked={formData.nifMesmoMotorista} 
                onChange={(e) => setFormData(prev => ({ ...prev, nifMesmoMotorista: e.target.checked }))}
                className="rounded border-slate-300 text-tvde-primary focus:ring-tvde-primary w-4 h-4"
              />
              <span>NIF Faturação igual ao do Motorista</span>
            </label>
          </div>
          <div className="md:col-span-1">
            {renderInputIA("NIF para Faturação / Payout", "nifPagamento", !formData.nifMesmoMotorista, formData.nifMesmoMotorista)}
          </div>

          {/* Opção para duplicar registo como Proprietário/Parceiro em lote (Apenas visível na criação) */}
          {!initialData.id && onCriarProprietario && (
            <div className="md:col-span-3 pt-3 border-t border-slate-200/60 mt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={criarComoProprietario} 
                  onChange={(e) => setCriarComoProprietario(e.target.checked)}
                  className="rounded border-slate-300 text-tvde-primary focus:ring-tvde-primary w-4 h-4"
                />
                <span className="text-tvde-primary font-black uppercase tracking-wider text-[9px] flex items-center gap-1">
                  <Plus size={12} /> Ativar Criação Simultânea como Proprietário / Operador
                </span>
              </label>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* CONTA CORRENTE / AJUSTES FINANCEIROS OPERACIONAIS (Exclusivo para motoristas registados) */}
      {initialData.id && (
        <CollapsibleSection title="Conta Corrente / Ajustes Semanais" icon={History} iconColor="text-tvde-primary" defaultOpen={false}>
          <div className="space-y-3">
            {!isReadOnly && (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="md:col-span-1">
                  <select className={inputClass} value={novoMovimento.tipo} onChange={(e) => setNovoMovimento({...novoMovimento, tipo: e.target.value})}>
                    <option value="debito">🔴 Débito</option>
                    <option value="credito">🟢 Crédito</option>
                  </select>
                </div>
                <div className="md:col-span-1 relative">
                  <Euro className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input type="number" className={`${inputClass} pl-6`} placeholder="0.00" value={novoMovimento.valor} onChange={(e) => setNovoMovimento({...novoMovimento, valor: e.target.value})} />
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
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase">
                  <tr>
                    <th className="p-2">Data</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2 text-center">Tipo</th>
                    <th className="p-2 text-right">Valor</th>
                    {!isReadOnly && <th className="p-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {movimentos.length > 0 ? movimentos.map(m => (
                    <tr key={m.id}>
                      <td className="p-2">{new Date(m.dataLancamento).toLocaleDateString('pt-PT')}</td>
                      <td className="p-2 font-bold">{m.descricao}</td>
                      <td className="p-2 text-center uppercase font-black text-[8px]">{m.tipoMovimento}</td>
                      <td className={`p-2 text-right font-black ${m.tipoMovimento === 'credito' ? 'text-tvde-accent' : 'text-tvde-danger'}`}>{formatCurrency(m.valor)}</td>
                      {!isReadOnly && <td className="p-2 text-right"><button type="button" onClick={() => handleDeleteMovimento(m)} className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button></td>}
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="p-4 text-center text-slate-400 italic">Sem ajustes pendentes.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Documentação Digital" icon={BadgeCheck} iconColor="text-tvde-primary" defaultOpen={!!initialData.id}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DocumentCard title="Documento de Identificação" dateField="validadeID" slots={[{ label: "Frente", fileUrl: formData.docIDFront, uploadField: "docIDFront", folder: "motoristas/id" }, { label: "Verso", fileUrl: formData.docIDBack, uploadField: "docIDBack", folder: "motoristas/id" }]} />
          <DocumentCard title="Carta de Condução" dateField="validadeCarta" infoIA="A IA procurou validades profissionais (997/Pesados) no verso." slots={[{ label: "Frente", fileUrl: formData.docCartaFront, uploadField: "docCartaFront", folder: "motoristas/cartas" }, { label: "Verso", fileUrl: formData.docCartaBack, uploadField: "docCartaBack", folder: "motoristas/cartas" }]} />
          <DocumentCard title="Certificado TVDE" dateField="validadeTVDE" slots={[{ label: "Ficheiro", fileUrl: formData.docCertificadoTVDE, uploadField: "docCertificadoTVDE", folder: "motoristas/tvde" }]} />
          <DocumentCard title="Registo Criminal" dateField="validadeCriminal" slots={[{ label: "Ficheiro", fileUrl: formData.docRegistoCriminal, uploadField: "docRegistoCriminal", folder: "motoristas/criminal" }]} />
          <DocumentCard title="Comprovativo IBAN" slots={[{ label: "Ficheiro", fileUrl: formData.docIBAN, uploadField: "docIBAN", folder: "motoristas/iban" }]} />
          <DocumentCard title="Comprovativo Morada" slots={[{ label: "Ficheiro", fileUrl: formData.docMorada, uploadField: "docMorada", folder: "motoristas/morada" }]} />
        </div>
      </CollapsibleSection>

      {initialData.historico && initialData.historico.length > 0 && (
        <CollapsibleSection title="Histórico" icon={History} iconColor="text-slate-400" defaultOpen={false}>
          <div className="space-y-2">
            {[...initialData.historico].reverse().map((log, index) => (
              <div key={index} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px]">
                <div className="flex-1">
                  <div className="flex justify-between font-bold text-slate-700 mb-1"><span>{log.usuario}</span><span>{new Date(log.data).toLocaleDateString('pt-PT')}</span></div>
                  <p className="text-slate-500 italic">"{log.descricao}"</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* BOTÕES FIXOS NO RODAPÉ */}
      <div className="flex flex-col md:flex-row gap-3 mt-6 sticky bottom-0 bg-white pt-4 border-t border-slate-50">
        <Button variant="secondary" className="flex-1 h-12 text-xs" onClick={onCancel}>{isReadOnly ? 'Fechar' : 'Cancelar'}</Button>
        {initialData.id && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            onClick={() => setModalFinanceiroAberto(true)}
          >
            💰 Gestão Financeira
          </Button>
        )}
        {!isReadOnly && (
          <>
            <Button type="button" variant="outline" className="flex-1 h-12 text-xs border-tvde-primary text-tvde-primary hover:bg-blue-50" onClick={() => handleFinalSubmit(true)}><MessageSquare size={16} /> Guardar e Enviar Link</Button>
            <Button type="button" className="flex-1 h-12 text-xs shadow-md" onClick={() => handleFinalSubmit(false)}>Guardar Registo</Button>
          </>
        )}
      </div>

      <ModalFinanceiro
        isOpen={modalFinanceiroAberto}
        onClose={() => setModalFinanceiroAberto(false)}
        entidadeId={initialData.id}
        tipoEntidade="motorista"
        nomeEntidade={formData.nome || initialData.nome || 'Motorista'}
      />
    </form>
  );
}