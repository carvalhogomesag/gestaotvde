/**
 * VeiculoForm.jsx
 * Localização: src/features/veiculos/VeiculoForm.jsx
 *
 * Formulário de edição e criação de viaturas.
 * Refatorado de forma limpa com sub-modais importados fisicamente para melhor gestão.
 * Corrigido: Adicionado ícone ArrowRight nos imports de lucide-react para evitar erros de compilação.
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Car, Users, FileText, History, Wallet, Euro, ChevronDown, ChevronUp, ArrowRight 
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import ModalFinanceiro from '../financeiro/ModalFinanceiro';

// Importação Física dos Sub-Modais Componentizados
import ModalIdentificacao from './ModalIdentificacao';
import ModalAtribuicoes from './ModalAtribuicoes';
import ModalTarifas from './ModalTarifas';
import ModalDocumentos from './ModalDocumentos';
import ModalContaCorrente from './ModalContaCorrente';
import ModalCartoes from './ModalCartoes';

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
 * Componente Auxiliar: Secção Colapsável para o Histórico de Edições
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

export default function VeiculoForm({ 
  onSubmit, 
  initialData = {}, 
  motoristas = [], 
  proprietarios = [], 
  cartoes = [], 
  veiculos = [], 
  limiteAnosTVDE = 7, 
  onCancel, 
  isReadOnly = false, 
  onCriarProprietario, 
  onCriarMotorista 
}) {
  const { userData } = useAuth();
  
  // ESTADO CENTRAL DO FORMULÁRIO (Sincronizado)
  const [formData, setFormData] = useState({
    marca: initialData.marca || '', 
    modelo: initialData.modelo || '', 
    matricula: initialData.matricula || '', 
    ano: initialData.ano || '',
    dataPrimeiraMatricula: initialData.dataPrimeiraMatricula || '', 
    proprietarioId: initialData.proprietarioId || '', 
    proprietarioNome: initialData.proprietarioNome || '', 
    tipoAluguer: initialData.tipoAluguer || 'integral',
    motoristaId: initialData.motoristaId || '',
    motoristaNome: initialData.motoristaNome || '', 
    motoristaId2: initialData.motoristaId2 || '',
    motoristaNome2: initialData.motoristaNome2 || '', 
    docDUA: initialData.docDUA || '', 
    docSeguro: initialData.docSeguro || '',
    docIPO: initialData.docIPO || '', 
    validadeDUA: initialData.validadeDUA || '', 
    validadeSeguro: initialData.validadeSeguro || '', 
    validadeIPO: initialData.validadeIPO || '',
    fotoUrl: initialData.fotoUrl || '', 
    precoSemanal: initialData.precoSemanal || '', 
    cidade: initialData.cidade || 'Lisboa',
    combustivel: initialData.combustivel || 'Gasóleo',
    categoria: initialData.categoria || 'Standard',
    proprietarioCondutor: initialData.proprietarioCondutor || (initialData.proprietarioId && initialData.proprietarioId === initialData.motoristaId) || false
  });

  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState(
    initialData.categoria ? initialData.categoria.split(' / ').map(c => c.trim()) : ['Standard']
  );

  const [movimentos, setMovimentos] = useState([]);
  const [aparelhosAtivos, setAparelhosAtivos] = useState([]);
  const [modalFinanceiroAberto, setModalFinanceiroAberto] = useState(false);

  // Estados de abertura para os modais
  const [modalIdentificacaoAberto, setModalIdentificacaoAberto] = useState(false);
  const [modalAtribuicoesAberto, setModalAtribuicoesAberto] = useState(false);
  const [modalTarifasAberto, setModalTarifasAberto] = useState(false);
  const [modalDocumentosAberto, setModalDocumentosAberto] = useState(false);
  const [modalContaCorrenteAberto, setModalContaCorrenteAberto] = useState(false);
  const [modalCartoesAberto, setModalCartoesAberto] = useState(false);

  // Sincronização Reativa do Proprietário Condutor [2]
  useEffect(() => {
    if (formData.proprietarioCondutor) {
      setFormData(prev => ({
        ...prev,
        proprietarioId: prev.motoristaId,
        proprietarioNome: prev.motoristaNome
      }));
    }
  }, [formData.motoristaId, formData.motoristaNome, formData.proprietarioCondutor]);

  // Sincroniza seleção de categorias
  useEffect(() => {
    setFormData(prev => ({ ...prev, categoria: categoriasSelecionadas.join(' / ') }));
  }, [categoriasSelecionadas]);

  // Sincronização da conta corrente do veículo
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

  // Sincronização de aparelhos Via Verde em uso
  useEffect(() => {
    const q = query(collection(db, "viaverde_aparelhos"), where("estado", "==", "Em Uso"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAparelhosAtivos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const cartoesAtribuidos = cartoes.filter(c => c.veiculoId === initialData.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-1 max-h-[75vh] overflow-y-auto pr-3.5 custom-scrollbar text-left font-sans">
      
      {/* GRELHA DE BOTÕES TÁTEIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
        
        <button type="button" onClick={() => setModalIdentificacaoAberto(true)} className="p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition-transform shrink-0"><Car size={16} /></div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Identificação & Especificações</p>
              <p className="text-[9.5px] text-slate-400 truncate">Matrícula, Marca, Modelo, Categorias e Ano.</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        <button type="button" onClick={() => setModalAtribuicoesAberto(true)} className="p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition-transform shrink-0"><Users size={16} /></div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Atribuições de Operação</p>
              <p className="text-[9.5px] text-slate-400 truncate">Regime, Proprietário e Condutores associados.</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        <button type="button" onClick={() => setModalTarifasAberto(true)} className="p-2.5 bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:scale-105 transition-transform shrink-0"><Euro size={16} /></div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Tarifas & Catálogo</p>
              <p className="text-[9.5px] text-slate-400 truncate">Tarifa semanal e região no catálogo público.</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        <button type="button" onClick={() => setModalDocumentosAberto(true)} className="p-2.5 bg-slate-50 hover:bg-amber-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:scale-105 transition-transform shrink-0"><FileText size={16} /></div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Documentação & Foto</p>
              <p className="text-[9.5px] text-slate-400 truncate">DUA, apólice de Seguro, IPO e Foto Real.</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {initialData.id && (
          <button type="button" onClick={() => setModalContaCorrenteAberto(true)} className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:scale-105 transition-transform shrink-0"><Wallet size={16} /></div>
              <div className="truncate">
                <p className="text-xs font-black text-slate-800">Conta Corrente & Ajustes</p>
                <p className="text-[9.5px] text-slate-400 truncate">Histórico financeiro, cauções e lançamentos.</p>
              </div>
            </div>
            <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
          </button>
        )}

        {initialData.id && (
          <button type="button" onClick={() => setModalCartoesAberto(true)} className="p-2.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform shrink-0"><CreditCard size={16} /></div>
              <div className="truncate">
                <p className="text-xs font-black text-slate-800">Cartões Consumo</p>
                <p className="text-[9.5px] text-slate-400 truncate">Cartões de abastecimento ou carregamento vinculados.</p>
              </div>
            </div>
            <ArrowRight size={12} className="text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
          </button>
        )}
      </div>

      {/* SEÇÃO DO HISTÓRICO DE EDIÇÕES */}
      {initialData.historico && initialData.historico.length > 0 && (
        <CollapsibleSection title="Histórico de Edições" icon={History} iconColor="text-slate-400" defaultOpen={false}>
          <div className="space-y-1.5 text-left font-sans">
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

      {/* RENDERIZAÇÃO DOS SUB-MODAIS CONTROLADOS PELO ESTADO */}
      <ModalIdentificacao isOpen={modalIdentificacaoAberto} onClose={() => setModalIdentificacaoAberto(false)} formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} veiculos={veiculos} limiteAnosTVDE={limiteAnosTVDE} categoriasSelecionadas={categoriasSelecionadas} handleCategoriaToggle={handleCategoriaToggle} />
      <ModalAtribuicoes isOpen={modalAtribuicoesAberto} onClose={() => setModalAtribuicoesAberto(false)} formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} initialData={initialData} proprietarios={proprietarios} motoristas={motoristas} aparelhosAtivos={aparelhosAtivos} onCriarProprietario={onCriarProprietario} onCriarMotorista={onCriarMotorista} />
      <ModalTarifas isOpen={modalTarifasAberto} onClose={() => setModalTarifasAberto(false)} formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />
      <ModalDocumentos isOpen={modalDocumentosAberto} onClose={() => setModalDocumentosAberto(false)} formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />
      <ModalContaCorrente isOpen={modalContaCorrenteAberto} onClose={() => setModalContaCorrenteAberto(false)} formData={formData} isReadOnly={isReadOnly} movimentos={movimentos} setMovimentos={setMovimentos} userData={userData} initialData={initialData} />
      <ModalCartoes isOpen={modalCartoesAberto} onClose={() => setModalCartoesAberto(false)} cartoesAtribuidos={cartoesAtribuidos} />

      {/* BOTÕES FIXOS NO RODAPÉ */}
      <div className="flex gap-3 mt-6 sticky bottom-0 bg-white pt-4 border-t border-slate-50">
        <Button variant="secondary" className="flex-1 h-10 text-xs text-center justify-center" onClick={onCancel}>{isReadOnly ? 'Fechar' : 'Cancelar'}</Button>
        {initialData.id && (
          <Button type="button" variant="outline" className="flex-1 h-10 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-center justify-center" onClick={() => setModalFinanceiroAberto(true)}>💰 Gestão Financeira</Button>
        )}
        {!isReadOnly && <Button type="submit" className="flex-1 h-10 text-xs shadow-md text-center justify-center">Guardar Veículo</Button>}
      </div>

      <ModalFinanceiro isOpen={modalFinanceiroAberto} onClose={() => setModalFinanceiroAberto(false)} entidadeId={initialData.id} tipoEntidade="veiculo" nomeEntidade={formData.matricula || initialData.matricula || 'Veículo'} />
    </form>
  );
}