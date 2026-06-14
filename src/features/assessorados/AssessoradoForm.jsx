/**
 * AssessoradoForm.jsx
 * Localização: src/features/assessorados/AssessoradoForm.jsx
 *
 * Formulário para criação, edição e consulta detalhada de Clientes em Assessoria.
 * Totalmente responsivo com suporte a checklists táteis divididas por etapas burocráticas.
 */

import React, { useState } from 'react';
import { 
  User, Phone, Mail, BookOpen, Layers, CheckCircle2, 
  ChevronDown, ChevronUp, History, ClipboardCheck, DollarSign
} from 'lucide-react';
import Button from '../../components/ui/Button';

/**
 * Componente Auxiliar: Secção Colapsável Compacta
 */
const CollapsibleSection = ({ title, icon: Icon, iconColor, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100/50 last:border-0">
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between group cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-all py-2"
      >
        <h4 className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-2 ${iconColor}`}>
          <Icon size={14} /> {title}
        </h4>
        <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
          {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100 mt-2 mb-4' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
};

export default function AssessoradoForm({ 
  onSubmit, onCancel, initialData = {}, planos = [], isReadOnly = false 
}) {
  const [formData, setFormData] = useState({
    nome: initialData.nome || '',
    telemovel: initialData.telemovel || '',
    email: initialData.email || '',
    nif: initialData.nif || '',
    iban: initialData.iban || '',
    cidade: initialData.cidade || 'Lisboa',
    planoId: initialData.planoId || '',
    planoNome: initialData.planoNome || '',
    precoCobrado: initialData.precoCobrado || '',
    etapaAdicional: initialData.etapaAdicional || 'Inscrição',
    status: initialData.status || 'Ativo',
    
    // Checkbox de progresso (Checklist TVDE)
    chkRegistoCriminal: initialData.chkRegistoCriminal || false,
    chkPsicotecnico: initialData.chkPsicotecnico || false,
    chkExameMedico: initialData.chkExameMedico || false,
    chkEscolaInscrito: initialData.chkEscolaInscrito || false,
    chkCursoConcluido: initialData.chkCursoConcluido || false,
    chkTaxasPagas: initialData.chkTaxasPagas || false,
    chkPedidoSubmetido: initialData.chkPedidoSubmetido || false,
    chkCertificadoEmitido: initialData.chkCertificadoEmitido || false,
    chkContaUber: initialData.chkContaUber || false,
    chkContaBolt: initialData.chkContaBolt || false,
  });

  const inputClass = `w-full p-2.5 border border-slate-200 rounded-xl outline-none transition-all text-xs sm:text-sm ${
    isReadOnly 
      ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' 
      : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'
  }`;

  // Sincroniza o preenchimento automático do preço e do nome do plano ao selecionar
  const handlePlanoChange = (e) => {
    const selectedId = e.target.value;
    const planoObj = planos.find(p => p.id === selectedId);
    if (planoObj) {
      setFormData(prev => ({
        ...prev,
        planoId: selectedId,
        planoNome: planoObj.nome,
        precoCobrado: Number(planoObj.preco || 0)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        planoId: '',
        planoNome: 'Personalizado',
        precoCobrado: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  /**
   * Componente Interno Responsivo para cada Caixa de Checklist Táctil
   */
  const CheckboxItem = ({ label, field }) => (
    <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
      formData[field] 
        ? 'bg-emerald-50/50 border-emerald-200' 
        : 'bg-slate-50/50 border-slate-200/80 hover:border-slate-300'
    } ${isReadOnly ? 'pointer-events-none' : ''}`}>
      <input
        type="checkbox"
        disabled={isReadOnly}
        checked={formData[field]}
        onChange={(e) => setFormData({ ...formData, [field]: e.target.checked })}
        className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0"
      />
      <span className="text-xs font-bold text-slate-700 leading-tight">{label}</span>
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar text-left">
      
      {/* 1. Identificação do Cliente */}
      <div className="bg-slate-50 p-4 sm:p-5 rounded-[2rem] border border-slate-100/50 space-y-4">
        <h4 className="text-[11px] font-black text-tvde-primary uppercase tracking-wider flex items-center gap-2 mb-2">
          <User size={14} /> Dados do Cliente
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Nome Completo *</label>
            <input required readOnly={isReadOnly} className={inputClass} value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Telemóvel *</label>
            <input required type="tel" readOnly={isReadOnly} className={inputClass} value={formData.telemovel} onChange={(e) => setFormData({...formData, telemovel: e.target.value})} />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Email</label>
            <input type="email" readOnly={isReadOnly} className={inputClass} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">NIF</label>
            <input readOnly={isReadOnly} className={`${inputClass} font-mono`} value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value})} />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">IBAN</label>
            <input readOnly={isReadOnly} className={`${inputClass} font-mono`} value={formData.iban} onChange={(e) => setFormData({...formData, iban: e.target.value})} />
          </div>
        </div>
      </div>

      {/* 2. Seleção de Plano & Finanças */}
      <CollapsibleSection title="Plano & Negócio" icon={BookOpen} iconColor="text-tvde-primary" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Plano Pretendido</label>
            <select 
              disabled={isReadOnly} 
              className={inputClass} 
              value={formData.planoId} 
              onChange={handlePlanoChange}
            >
              <option value="">Selecione um plano...</option>
              {planos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.preco}€)</option>)}
              <option value="avulso">Serviço Avulso / Personalizado</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Valor Cobrado (€)</label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="number" 
                readOnly={isReadOnly} 
                className={`${inputClass} pl-6`} 
                value={formData.precoCobrado} 
                onChange={(e) => setFormData({...formData, precoCobrado: e.target.value})} 
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Região da Licença</label>
            <select 
              disabled={isReadOnly} 
              className={inputClass} 
              value={formData.cidade} 
              onChange={(e) => setFormData({...formData, cidade: e.target.value})}
            >
              <option value="Lisboa">Grande Lisboa</option>
              <option value="Porto">Grande Porto</option>
              <option value="Braga">Minho / Braga</option>
              <option value="Algarve">Algarve</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Etapa de Assessoria</label>
            <select 
              disabled={isReadOnly} 
              className={inputClass} 
              value={formData.etapaAdicional} 
              onChange={(e) => setFormData({...formData, etapaAdicional: e.target.value})}
            >
              <option value="Inscrição">🔵 1. Inscrição & Clínicas</option>
              <option value="Formação">🟡 2. Curso Formação TVDE</option>
              <option value="IMT">🟣 3. Pedido / Validação IMT</option>
              <option value="Contas">🔵 4. Ativação de Aplicações</option>
              <option value="Vinculado">🟢 5. Concluído & Vinculado</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Status Geral</label>
            <select 
              disabled={isReadOnly} 
              className={inputClass} 
              value={formData.status} 
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="Ativo">Ativo / Em curso</option>
              <option value="Concluído">Concluído</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

      {/* 3. Checklists de Progresso (Regulatório Português) */}
      <CollapsibleSection title="Checklist de Progresso (Etapas TVDE)" icon={ClipboardCheck} iconColor="text-tvde-primary" defaultOpen={false}>
        <div className="space-y-4 pt-1">
          
          {/* Grupo 1: Etapa de Inscrição e Clínicas */}
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Fase 1: Preparação & Clínicas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <CheckboxItem label="Registo Criminal TVDE emitido (menos de 30 dias)" field="chkRegistoCriminal" />
              <CheckboxItem label="Avaliação Psicotécnica Grupo 2 realizada" field="chkPsicotecnico" />
              <CheckboxItem label="Atestado Médico Grupo 2 obtido" field="chkExameMedico" />
              <CheckboxItem label="Pré-inscrição em Escola Homologada efectuada" field="chkEscolaInscrito" />
            </div>
          </div>

          {/* Grupo 2: Formação e Emissão de Certificado */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2">Fase 2: Curso & Certificado IMT</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <CheckboxItem label="Curso TVDE 125h Concluído com Sucesso" field="chkCursoConcluido" />
              <CheckboxItem label="Taxas do IMT (Certificado) Pagas" field="chkTaxasPagas" />
              <CheckboxItem label="Pedido de Licença Submetido ao IMT" field="chkPedidoSubmetido" />
              <CheckboxItem label="Certificado TVDE emitido (Código 997 averbado)" field="chkCertificadoEmitido" />
            </div>
          </div>

          {/* Grupo 3: Criação de contas e Plataformas */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Fase 3: Contas & Ativação</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <CheckboxItem label="Conta de Motorista Uber criada e validada" field="chkContaUber" />
              <CheckboxItem label="Conta de Motorista Bolt criada e validada" field="chkContaBolt" />
            </div>
          </div>

        </div>
      </CollapsibleSection>

      {/* 4. Histórico de Alterações */}
      {initialData.historico && initialData.historico.length > 0 && (
        <CollapsibleSection title="Histórico do Processo" icon={History} iconColor="text-slate-400" defaultOpen={false}>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {[...initialData.historico].reverse().map((log, index) => (
              <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px]">
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>{log.usuario}</span>
                  <span className="font-mono text-slate-400">{new Date(log.data).toLocaleDateString('pt-PT')} — {new Date(log.data).toLocaleTimeString('pt-PT')}</span>
                </div>
                <p className="text-slate-500 italic">"{log.descricao}"</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Botões do Rodapé */}
      <div className="flex gap-3 mt-6 sticky bottom-0 bg-white pt-4 border-t border-slate-100">
        <Button variant="secondary" className="flex-1 h-10 text-xs" onClick={onCancel}>
          {isReadOnly ? 'Fechar Ficha' : 'Cancelar'}
        </Button>
        {!isReadOnly && (
          <Button type="submit" className="flex-1 h-10 text-xs shadow-md">
            {initialData.id ? 'Gravar Alterações' : 'Iniciar Assessoria'}
          </Button>
        )}
      </div>

    </form>
  );
}