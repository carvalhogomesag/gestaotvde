/**
 * MotoristaForm.jsx
 * Localização: src/features/motoristas/MotoristaForm.jsx
 *
 * Formulário e ficha cadastral otimizada do motorista.
 * Otimizado com:
 * - Redução de ruído visual: campos secundários movidos para sub-modais dedicados [2].
 * - Botões táteis com ícones e legendas para navegação rápida de ecrã [2].
 * - ◄ CORRIGIDO: Remoção definitiva e purga da Conta Corrente órfã e do useEffect setMovimentos [2].
 * - Compactação extrema de paddings, margins, gaps e inputs para evitar scroll no desktop [2].
 * - Preservação estrita das integrações do Firestore, IA Vision, alertas e conformidade regulamentar [2].
 */

import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import FileUpload from '../../components/ui/FileUpload';
import DatePicker from '../../components/ui/DatePicker';
import { 
  User, Mail, CreditCard, BadgeCheck, MapPin, 
  CheckSquare, Square, Camera, Eye, Trash2, 
  CheckCircle2, AlertCircle, History, Wallet, Plus, Minus, 
  Euro, ChevronDown, ChevronUp, FileCheck, Image as ImageIcon, Info,
  MessageSquare, Share2, Send, Sparkles, ShieldCheck, AlertTriangle, ArrowRight, X, Car
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc, addDoc, collection, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { logAcaoGlobal } from '../../utils/logger';
import { formatCurrency } from '../../utils/formatters';
import ModalFinanceiro from '../financeiro/ModalFinanceiro';

/**
 * Função Auxiliar: Formata qualquer texto em Title Case,
 * mantendo as preposições portuguesas comuns em minúsculas.
 */
const formatTitleCase = (str) => {
  if (!str) return '';
  const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'em'];
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (preposicoes.includes(word) && index !== 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

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
 * Função Auxiliar: Aplica máscara de código postal português (0000-000)
 */
const formatPostalCode = (val) => {
  if (!val) return '';
  const clean = val.replace(/\D/g, '').substring(0, 7);
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
};

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

export default function MotoristaForm({ 
  onSubmit, 
  initialData = {}, 
  onCancel, 
  isReadOnly = false, 
  onCriarProprietario,
  veiculos = [],  
  cartoes = [],    
  motoristas = [] // Recebemos a lista para calcular a trava de cartões ocupados [1]
}) {
  const { userData } = useAuth();
  
  // ESTADO CENTRAL DO FORMULÁRIO (Mapeado e mascarado de origem)
  const [formData, setFormData] = useState({
    nome: initialData.nome || '', 
    email: initialData.email || '', 
    telemovel: formatPhone(initialData.telemovel || ''), 
    nif: initialData.nif || '',
    nifPagamento: initialData.nifPagamento || '', 
    nifMesmoMotorista: initialData.nifMesmoMotorista || false, 
    numID: initialData.numID || '', 
    numCarta: initialData.numCarta || '', 
    numTVDE: initialData.numTVDE || '', 
    dataNascimento: initialData.dataNascimento || '', 
    iban: initialData.iban || '',
    moradaTipo: initialData.moradaTipo || '', 
    moradaRua: initialData.moradaRua || '', 
    moradaNumero: initialData.moradaNumero || '',
    moradaComplemento: initialData.moradaComplemento || '', 
    codigoPostal: formatPostalCode(initialData.codigoPostal || ''), 
    localidade: initialData.localidade || '',
    status: initialData.status || 'Ativo', 
    fotoPerfil: initialData.fotoPerfil || '', 
    docIDFront: initialData.docIDFront || '',
    docIDBack: initialData.docIDBack || '', 
    docCartaFront: initialData.docCartaFront || '', 
    docCartaBack: initialData.docCartaBack || '',
    docCertificadoTVDE: initialData.docCertificadoTVDE || '', 
    docRegistoCriminal: initialData.docRegistoCriminal || '',
    docIBAN: initialData.docIBAN || '', 
    docMorada: initialData.docMorada || '', 
    validadeID: initialData.validadeID || '',
    validadeCarta: initialData.validadeCarta || '', 
    validadeTVDE: initialData.validadeTVDE || '', 
    validadeCriminal: initialData.validadeCriminal || '',
    observacoes_ia: initialData.observacoes_ia || '',
    alerta_inconsistencia: initialData.alerta_inconsistencia || false,
    motivo_inconsistencia: initialData.motivo_inconsistencia || '',
    
    // Atribuição de Frota e Cartões
    veiculoId: initialData.veiculoId || '',
    veiculoMatricula: initialData.veiculoMatricula || '',
    cartaoAbastecimentoId: initialData.cartaoAbastecimentoId || '',
    cartaoAbastecimentoNumero: initialData.cartaoAbastecimentoNumero || '',
    cartaoCarregamentoId: initialData.cartaoCarregamentoId || '',
    cartaoCarregamentoNumero: initialData.cartaoCarregamentoNumero || ''
  });

  const [criarComoProprietario, setCriarComoProprietario] = useState(false);
  const [modalFinanceiroAberto, setModalFinanceiroAberto] = useState(false);

  // Estados para controlo dos sub-modais de UX
  const [modalIdentificacaoAberto, setModalIdentificacaoAberto] = useState(false);
  const [modalMoradaAberto, setModalMoradaAberto] = useState(false);
  const [modalFaturacaoAberto, setModalFaturacaoAberto] = useState(false);
  const [modalDocumentosAberto, setModalDocumentosAberto] = useState(false);
  const [modalFrotaAberto, setModalFrotaAberto] = useState(false); 

  // LÓGICA DA TRAVA: Mapeia cartões já atribuídos a OUTROS motoristas para bloqueá-los [1]
  const cartoesAbastecimentoOcupados = motoristas
    .filter(m => m.id !== initialData.id && m.cartaoAbastecimentoId)
    .map(m => m.cartaoAbastecimentoId);

  const cartoesCarregamentoOcupados = motoristas
    .filter(m => m.id !== initialData.id && m.cartaoCarregamentoId)
    .map(m => m.cartaoCarregamentoId);

  // Filtrar os cartões que estão livres na base de dados para atribuição [1]
  const cartoesCombustivelDisponiveis = cartoes.filter(card => {
    const isCombustivel = card.tipo === 'combustivel';
    const isOcupadoPorOutro = cartoesAbastecimentoOcupados.includes(card.id);
    return isCombustivel && !isOcupadoPorOutro;
  });

  const cartoesEletricosDisponiveis = cartoes.filter(card => {
    const isEletrico = card.tipo === 'eletrico';
    const isOcupadoPorOutro = cartoesCarregamentoOcupados.includes(card.id);
    return isEletrico && !isOcupadoPorOutro;
  });

  // Vínculo do campo IBAN ao seu respetivo documento de origem para auditoria visual
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
      telemovel: formatPhone(initialData.telemovel || prev.telemovel || ''),
      codigoPostal: formatPostalCode(initialData.codigoPostal || prev.codigoPostal || ''),
      observacoes_ia: initialData.observacoes_ia || prev.observacoes_ia,
      alerta_inconsistencia: initialData.alerta_inconsistencia || prev.alerta_inconsistencia,
      motivo_inconsistencia: initialData.motivo_inconsistencia || prev.motivo_inconsistencia
    }));
  }, [initialData]);

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

  const handleEnviarLinkExistente = (metodo) => {
    const cleanTelemovel = formData.telemovel.replace(/\D/g, '');
    const onboardingUrl = `${window.location.origin}/onboarding/${initialData.id}`;
    const mensagem = `Olá ${formData.nome}, utilize este link para carregar os seus documentos: ${onboardingUrl}`;
    if (metodo === 'whatsapp') {
      window.open(`https://wa.me/351${cleanTelemovel}?text=${encodeURIComponent(mensagem)}`, '_blank');
    } else if (metodo === 'email') {
      window.location.href = `mailto:${formData.email}?subject=Registo de Motorista - Documentação&body=${encodeURIComponent(mensagem)}`;
    }
    logAcaoGlobal(userData.nome, "Reenvio de Link Onboarding", "Motoristas", formData.nome, initialData.id);
  };

  const handleRemoveFile = (field) => { if (window.confirm("Deseja remover este documento?")) { setFormData(prev => ({ ...prev, [field]: '' })); } };

  const inputClass = `w-full py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none transition-all text-xs ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;

  const renderInputIA = (label, field, required = false, forceReadOnly = false) => {
    const isAIFilled = initialData[`ai_filled_${field}`];
    const docUrl = fieldToDocMap[field];

    return (
      <div className="relative group text-left">
        <label className="block text-[8.5px] font-black text-slate-400 uppercase mb-0.5 ml-1 flex justify-between items-center">
          <span>{label} {required && '*'}</span>
          {isAIFilled && <span className="text-blue-500 flex items-center gap-1 animate-pulse"><Sparkles size={9} /> IA</span>}
        </label>
        <div className="relative flex items-center">
          <input 
            required={required} readOnly={isReadOnly || forceReadOnly} 
            className={`${inputClass} ${isAIFilled ? 'border-blue-300 bg-blue-50/20 ring-1 ring-blue-100 pr-14' : ''} ${forceReadOnly ? 'bg-slate-100 text-slate-400 font-medium cursor-not-allowed' : ''}`} 
            value={formData[field] || ''} 
            onChange={(e) => {
              let val = e.target.value;
              if (field === 'codigoPostal') {
                val = formatPostalCode(val);
              }
              setFormData({...formData, [field]: val});
              if (isAIFilled) validarCampoIA(field);
            }} 
          />
          
          <div className="absolute right-1.5 flex items-center gap-0.5">
            {docUrl && (
              <button type="button" onClick={() => abrirDocumentoPopup(docUrl)} className="p-1 text-slate-400 hover:text-tvde-primary hover:bg-blue-50 rounded transition-all" title="Ver documento de origem">
                <Eye size={12} />
              </button>
            )}
            {isAIFilled && !isReadOnly && (
              <button type="button" onClick={() => validarCampoIA(field)} className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm transition-all" title="Confirmar dado lido pela IA">
                <ShieldCheck size={12} />
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
    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full relative text-left">
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
    // Purga de máscaras visuais para persistência consistente no Firestore
    const cleanTelemovel = formData.telemovel.replace(/\D/g, '');
    const cleanCodigoPostal = formData.codigoPostal.replace(/\D/g, '');
    const cleanEmail = formData.email.trim();
    
    if (!formData.nome || !cleanTelemovel || !cleanEmail) { 
      alert("Preencha Nome, Telemóvel e Email."); 
      return; 
    }

    const dadosLimposParaGuardar = {
      ...formData,
      telemovel: cleanTelemovel,
      codigoPostal: cleanCodigoPostal
    };

    if (criarComoProprietario && onCriarProprietario) { 
      await onCriarProprietario({ 
        nome: formData.nome, 
        nif: formData.nif, 
        iban: formData.iban, 
        telemovel: cleanTelemovel, 
        email: formData.email 
      }); 
    }
    
    onSubmit(dadosLimposParaGuardar, enviarLink);
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-1 max-h-[75vh] overflow-y-auto pr-3.5 custom-scrollbar">

      {/* BLOCO DE ALERTAS IA (REVISÃO E INCONSISTÊNCIA) */}
      {(Object.keys(initialData).some(k => k.startsWith('ai_filled_') && initialData[k] === true) || formData.alerta_inconsistencia) && (
        <div className="space-y-2 mb-3">
          {/* Alerta de Inconsistência (Crítico) */}
          {formData.alerta_inconsistencia && (
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 text-left">
              <div className="flex items-start gap-3 text-orange-600">
                <AlertTriangle size={18} className="animate-pulse mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-tight">Alerta de Inconsistência!</p>
                  <p className="text-[10px] bg-white/50 p-1.5 rounded-lg mt-1 border border-orange-100 italic">
                    {formData.motivo_inconsistencia || "A IA detetou dados divergentes entre os documentos carregados."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Aviso de Preenchimento Automático */}
          {Object.keys(initialData).some(k => k.startsWith('ai_filled_') && initialData[k] === true) && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 text-left">
              <div className="flex items-start gap-3 text-blue-600">
                <Sparkles size={18} className="animate-pulse mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold">A IA preencheu dados automaticamente!</p>
                  {formData.observacoes_ia && <p className="text-[10px] bg-white/50 p-1.5 rounded-lg mt-1 border border-blue-100 italic"><strong>Nota da IA:</strong> {formData.observacoes_ia}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grelha de botões de navegação para sub-modais de UX (Symmetric Layout) [2] */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
        
        {/* Botão 1: Identificação & Ficha Cadastral */}
        <button
          type="button"
          onClick={() => setModalIdentificacaoAberto(true)}
          className="p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
              <User size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Identificação & Ficha</p>
              <p className="text-[9.5px] text-slate-400 truncate">Nome, NIF, nascimento, carta de condução [2].</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {/* Botão 2: Contacto e Morada */}
        <button
          type="button"
          onClick={() => setModalMoradaAberto(true)}
          className="p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
              <MapPin size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Contacto & Morada</p>
              <p className="text-[9.5px] text-slate-400 truncate">Telemóvel, e-mail e morada fiscal [2].</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {/* Botão 3: Dados Financeiros */}
        <button
          type="button"
          onClick={() => setModalFaturacaoAberto(true)}
          className="p-2.5 bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
              <Wallet size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Dados Financeiros</p>
              <p className="text-[9.5px] text-slate-400 truncate">IBAN, NIF e payout de faturamento [2].</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {/* Botão 4: Documentação Digital */}
        <button
          type="button"
          onClick={() => setModalDocumentosAberto(true)}
          className="p-2.5 bg-slate-50 hover:bg-amber-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
              <BadgeCheck size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Documentação</p>
              <p className="text-[9.5px] text-slate-400 truncate">Validação, fotos e histórico de IA [2].</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {/* Botão 5: Atribuição de Frota & Cartões [1] */}
        <button
          type="button"
          onClick={() => setModalFrotaAberto(true)}
          className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
              <Car size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Atribuição de Frota</p>
              <p className="text-[9.5px] text-slate-400 truncate">Vincular veículo e cartões de consumo [1].</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {/* Botão 6: Onboarding WhatsApp */}
        {initialData.id && !isReadOnly && (
          <button
            type="button"
            onClick={() => handleEnviarLinkExistente('whatsapp')}
            className="p-2.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
                <Share2 size={16} />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-slate-800">Onboarding Digital</p>
                <p className="text-[9.5px] text-slate-400 truncate">Reenviar WhatsApp para recolha [2].</p>
              </div>
            </div>
            <ArrowRight size={12} className="text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
          </button>
        )}

        {/* Botão 7: Gestão Financeira */}
        {initialData.id && (
          <button
            type="button"
            onClick={() => setModalFinanceiroAberto(true)}
            className={`p-2.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left ${
              isReadOnly ? '' : 'sm:col-span-2'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
                <Euro size={16} />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-slate-800">Gestão Financeira</p>
                <p className="text-[9.5px] text-slate-400 truncate">Saldos, cauções, adiantamentos e renegociações [2].</p>
              </div>
            </div>
            <ArrowRight size={12} className="text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
          </button>
        )}
      </div>

      {initialData.historico && initialData.historico.length > 0 && (
        <CollapsibleSection title="Histórico de Edições" icon={History} iconColor="text-slate-400" defaultOpen={false}>
          <div className="space-y-1.5">
            {[...initialData.historico].reverse().map((log, index) => (
              <div key={index} className="flex gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px]">
                <div className="flex-1">
                  <div className="flex justify-between font-bold text-slate-700 mb-1"><span>{log.usuario}</span><span>{new Date(log.data).toLocaleDateString('pt-PT')}</span></div>
                  <p className="text-slate-500 italic">"{log.descricao}"</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* SUB-MODAL 0: Identificação e Dados Cadastrais */}
      {modalIdentificacaoAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalIdentificacaoAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalIdentificacaoAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <User size={18} className="text-blue-500" /> Identificação & Ficha Cadastral
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              
              <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white flex items-center justify-center shrink-0">
                    {formData.fotoPerfil ? <img src={formData.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" /> : <User size={28} className="text-slate-200" />}
                  </div>
                  {!isReadOnly && <FileUpload mode="minimal" label={<div className="p-1 bg-tvde-primary text-white rounded-full shadow-md cursor-pointer border-2 border-white"><Camera size={10}/></div>} folder="motoristas/fotos" onUploadComplete={(url) => setFormData({...formData, fotoPerfil: url})} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Fotografia de Perfil</p>
                  <p className="text-[10px] text-slate-400">Carregue uma imagem clara do rosto em formato quadrado ou proporções 1:1 [2].</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full pt-1">
                <div className="md:col-span-3">{renderInputIA("Nome Completo", "nome", true)}</div>
                <div><DatePicker label="Nascimento" value={formData.dataNascimento} onChange={(val) => { setFormData({...formData, dataNascimento: val}); if (initialData.ai_filled_dataNascimento) validarCampoIA('dataNascimento'); }} isReadOnly={isReadOnly} /></div>
                <div>{renderInputIA("NIF", "nif")}</div>
                <div>{renderInputIA("ID Documento", "numID")}</div>
                <div>{renderInputIA("Nº Carta Condução", "numCarta")}</div>
                <div className="md:col-span-2">{renderInputIA("Certificado TVDE", "numTVDE")}</div>
              </div>

            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalIdentificacaoAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 1: Contacto e Morada */}
      {modalMoradaAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalMoradaAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalMoradaAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <MapPin size={18} className="text-blue-500" /> Contacto e Morada Fiscal
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Email *</label><input type="email" required readOnly={isReadOnly} className={inputClass} value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Telemóvel *</label><div className="flex"><span className="inline-flex items-center px-2 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 font-bold text-[10px]">+351</span><input required readOnly={isReadOnly} className={`${inputClass} rounded-l-none font-mono`} value={formData.telemovel || ''} onChange={(e) => setFormData({...formData, telemovel: formatPhone(e.target.value)})} /></div></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 pt-2">
                <div className="sm:col-span-2">{renderInputIA("Rua / Avenida", "moradaRua")}</div>
                <div>{renderInputIA("Cód. Postal", "codigoPostal")}</div>
                <div>{renderInputIA("Localidade", "localidade")}</div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalMoradaAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: Dados Financeiros e Faturação */}
      {modalFaturacaoAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalFaturacaoAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalFaturacaoAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <Wallet size={18} className="text-purple-600" /> Configuração Financeira & Faturação
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-100 items-end">
                <div className="sm:col-span-3">
                  {renderInputIA("IBAN para Recebimentos", "iban", true)}
                </div>
                <div className="sm:col-span-3 flex items-center h-[38px] pb-1 border-t border-slate-200/50 pt-2">
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
                <div className="sm:col-span-3">
                  {renderInputIA("NIF para Faturação / Payout", "nifPagamento", !formData.nifMesmoMotorista, formData.nifMesmoMotorista)}
                </div>

                {!initialData.id && onCriarProprietario && (
                  <div className="sm:col-span-3 pt-3 border-t border-slate-200/60 mt-2">
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
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalFaturacaoAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: Documentação Digital */}
      {modalDocumentosAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalDocumentosAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalDocumentosAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <BadgeCheck size={18} className="text-blue-500" /> Documentação Digital
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DocumentCard title="Documento de Identificação" dateField="validadeID" slots={[{ label: "Frente", fileUrl: formData.docIDFront, uploadField: "docIDFront", folder: "motoristas/id" }, { label: "Verso", fileUrl: formData.docIDBack, uploadField: "docIDBack", folder: "motoristas/id" }]} />
                <DocumentCard title="Carta de Condução" dateField="validadeCarta" infoIA="A IA procurou validades profissionais (997/Pesados) no verso." slots={[{ label: "Frente", fileUrl: formData.docCartaFront, uploadField: "docCartaFront", folder: "motoristas/cartas" }, { label: "Verso", fileUrl: formData.docCartaBack, uploadField: "docCartaBack", folder: "motoristas/cartas" }]} />
                <DocumentCard title="Certificado TVDE" dateField="validadeTVDE" slots={[{ label: "Ficheiro", fileUrl: formData.docCertificadoTVDE, uploadField: "docCertificadoTVDE", folder: "motoristas/tvde" }]} />
                <DocumentCard title="Registo Criminal" dateField="validadeCriminal" slots={[{ label: "Ficheiro", fileUrl: formData.docRegistoCriminal, uploadField: "docRegistoCriminal", folder: "motoristas/criminal" }]} />
                <DocumentCard title="Comprovativo IBAN" slots={[{ label: "Ficheiro", fileUrl: formData.docIBAN, uploadField: "docIBAN", folder: "motoristas/iban" }]} />
                <DocumentCard title="Comprovativo Morada" slots={[{ label: "Ficheiro", fileUrl: formData.docMorada, uploadField: "docMorada", folder: "motoristas/morada" }]} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <Button type="button" onClick={() => setModalDocumentosAberto(false)} className="px-6 h-10 text-xs shadow-md">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 4: Atribuição de Frota & Cartões [1] */}
      {modalFrotaAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalFrotaAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalFrotaAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-indigo-700 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <Car size={18} className="text-indigo-600" /> Atribuição de Frota & Cartões
            </h3>
            
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Seleção do Veículo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Veículo Atribuído</label>
                <select 
                  disabled={isReadOnly}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-tvde-primary/20 text-slate-700 font-medium"
                  value={formData.veiculoId || ''}
                  onChange={(e) => {
                    const v = veiculos.find(veic => veic.id === e.target.value);
                    setFormData({
                      ...formData, 
                      veiculoId: e.target.value, 
                      veiculoMatricula: v ? v.matricula : ''
                    });
                  }}
                >
                  <option value="">Nenhum Veículo Atribuído (Em Stock)</option>
                  {veiculos.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.matricula} — {v.marca} {v.modelo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção do Cartão de Abastecimento (Combustível) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cartão de Abastecimento (Combustível)</label>
                <select 
                  disabled={isReadOnly}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-tvde-primary/20 text-slate-700 font-medium"
                  value={formData.cartaoAbastecimentoId || ''}
                  onChange={(e) => {
                    const c = cartoesCombustivelDisponiveis.find(card => card.id === e.target.value);
                    setFormData({
                      ...formData, 
                      cartaoAbastecimentoId: e.target.value, 
                      cartaoAbastecimentoNumero: c ? (c.numeroCartao || c.numero) : ''
                    });
                  }}
                >
                  <option value="">Nenhum Cartão Associado</option>
                  {cartoesCombustivelDisponiveis.map(card => (
                    <option key={card.id} value={card.id}>
                      {card.numeroCartao || card.numero} ({card.fornecedor})
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção do Cartão de Carregamento (Elétrico) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cartão de Carregamento (Elétrico)</label>
                <select 
                  disabled={isReadOnly}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-tvde-primary/20 text-slate-700 font-medium"
                  value={formData.cartaoCarregamentoId || ''}
                  onChange={(e) => {
                    const c = cartoesEletricosDisponiveis.find(card => card.id === e.target.value);
                    setFormData({
                      ...formData, 
                      cartaoCarregamentoId: e.target.value, 
                      cartaoCarregamentoNumero: c ? (c.numeroCartao || c.numero) : ''
                    });
                  }}
                >
                  <option value="">Nenhum Cartão Associado</option>
                  {cartoesEletricosDisponiveis.map(card => (
                    <option key={card.id} value={card.id}>
                      {card.numeroCartao || card.numero} ({card.fornecedor})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalFrotaAberto(false)} className="px-6 h-10 text-xs shadow-md">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÕES FIXOS NO RODAPÉ */}
      <div className="flex flex-col md:flex-row gap-2 mt-3.5 sticky bottom-0 bg-white pt-3 border-t border-slate-100">
        <Button variant="secondary" className="flex-1 h-10 text-xs" onClick={onCancel}>{isReadOnly ? 'Fechar' : 'Cancelar'}</Button>
        {!isReadOnly && (
          <>
            <Button type="button" variant="outline" className="flex-1 h-10 text-xs border-tvde-primary text-tvde-primary hover:bg-blue-50" onClick={() => handleFinalSubmit(true)}><MessageSquare size={14} /> Guardar e Enviar Link</Button>
            <Button type="button" className="flex-1 h-10 text-xs shadow-md" onClick={() => handleFinalSubmit(false)}>Guardar Registo</Button>
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