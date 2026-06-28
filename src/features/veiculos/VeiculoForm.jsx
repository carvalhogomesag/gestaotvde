/**
 * VeiculoForm.jsx
 * Localização: src/features/veiculos/VeiculoForm.jsx
 *
 * Formulário de edição e criação de viaturas.
 * Refatorado e componentizado por completo para melhor gestão e leitura do código.
 * 
 * [NOVO] Proprietário Condutor:
 * - Introduzido um Switch inteligente para vincular reativamente os dados 
 *   do proprietário ao motorista principal, evitando redundância de cadastros.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Car, Users, FileText, Eye, Trash2, 
  CheckCircle2, AlertCircle, Calendar, ShieldCheck, History,
  Wallet, Plus, Euro, ChevronDown, ChevronUp, Image as ImageIcon, MapPin, X, ArrowRight, Sparkles,
  Radio, UserCheck
} from 'lucide-react';
import Button from '../../components/ui/Button';
import FileUpload from '../../components/ui/FileUpload';
import DatePicker from '../../components/ui/DatePicker';
import { formatMatricula, formatCurrency } from '../../utils/formatters';
import { db } from '../../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { logAcaoGlobal } from '../../utils/logger';
import ModalFinanceiro from '../financeiro/ModalFinanceiro';

// Listas Estáticas de Marcas
const TODAS_AS_MARCAS = [
  "ABARTH", "AIXAM", "ALFA ROMEO", "ALPINA", "ALPINE", "ASTON MARTIN", "AUDI", "AUSTIN", 
  "AUTOBIANCHI", "BENTLEY", "BMW", "CADILLAC", "CHEVROLET", "CHRYSLER", "CITROЁN", "CUPRA", 
  "DACIA", "DAEWOO", "DAIHATSU", "DODGE", "DR", "DS", "FERRARI", "FIAT", "FORD", "FORD USA", 
  "HONDA", "HUMMER", "HYUNDAI", "INFINITI", "ISUZU", "IVECO", "JAGUAR", "JEEP", "KIA", "LADA", 
  "LAMBORGHINI", "LANCIA", "LAND ROVER", "LEXUS", "LOTUS", "MAN", "MASERATI", "MAZDA", 
  "MERCEDES-BENZ", "MG", "MINI", "MITSUBISHI", "NISSAN", "OPEL", "PEUGEOT", "PIAGGIO", 
  "POLESTAR", "PONTIAC", "PORSCHE", "RAM", "RENAULT", "RENAULT TRUCKS", "ROLLS-ROYCE", "ROVER", 
  "SAAB", "SANTANA", "SEAT", "SKODA", "SMART", "SSANGYONG", "SUBARU", "SUZUKI", "TALBOT", 
  "TATA (TELCO)", "TESLA", "TOYOTA", "TRABANT", "TRIUMPH", "VAUXHALL", "VOLVO", "VW"
];

const POPULARES_ESTATICOS = [
  "BMW", "VW", "MERCEDES-BENZ", "RENAULT", "AUDI", "OPEL", "PEUGEOT", "SEAT", "FORD", "CITROЁN"
];

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
  
  // ESTADO CENTRAL DO FORMULÁRIO
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
    // [NOVO] Estado booleano para o switch de Proprietário Condutor [2]
    proprietarioCondutor: initialData.proprietarioCondutor || (initialData.proprietarioId && initialData.proprietarioId === initialData.motoristaId) || false
  });

  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState(
    initialData.categoria ? initialData.categoria.split(' / ').map(c => c.trim()) : ['Standard']
  );

  const [movimentos, setMovimentos] = useState([]);
  const [aparelhosAtivos, setAparelhosAtivos] = useState([]);
  const [modalFinanceiroAberto, setModalFinanceiroAberto] = useState(false);

  // Estados de abertura para os novos sub-modais de UX
  const [modalIdentificacaoAberto, setModalIdentificacaoAberto] = useState(false);
  const [modalAtribuicoesAberto, setModalAtribuicoesAberto] = useState(false);
  const [modalTarifasAberto, setModalTarifasAberto] = useState(false);
  const [modalDocumentosAberto, setModalDocumentosAberto] = useState(false);
  const [modalContaCorrenteAberto, setModalContaCorrenteAberto] = useState(false);
  const [modalCartoesAberto, setModalCartoesAberto] = useState(false);

  // [NOVO] Sincronização Reativa do Proprietário Condutor [2]
  useEffect(() => {
    if (formData.proprietarioCondutor) {
      setFormData(prev => ({
        ...prev,
        proprietarioId: prev.motoristaId,
        proprietarioNome: prev.motoristaNome
      }));
    }
  }, [formData.motoristaId, formData.motoristaNome, formData.proprietarioCondutor]);

  // Sincroniza a seleção múltipla de categorias TVDE
  useEffect(() => {
    setFormData(prev => ({ ...prev, categoria: categoriasSelecionadas.join(' / ') }));
  }, [categoriasSelecionadas]);

  // Sincronização em tempo real da conta corrente do veículo
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

  // Sincronização de todos os transponders Via Verde em uso
  useEffect(() => {
    const q = query(collection(db, "viaverde_aparelhos"), where("estado", "==", "Em Uso"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAparelhosAtivos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const cartoesAtribuidos = cartoes.filter(c => c.veiculoId === initialData.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-1 max-h-[75vh] overflow-y-auto pr-3.5 custom-scrollbar">
      
      {/* GRELHA DE BOTÕES TÁTEIS DO VEÍCULO */}
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

      {/* SUB-MODAL 1: Identificação & Especificações */}
      {modalIdentificacaoAberto && (
        <ModalIdentificacao 
          isOpen={modalIdentificacaoAberto} 
          onClose={() => setModalIdentificacaoAberto(false)} 
          formData={formData} 
          setFormData={setFormData} 
          isReadOnly={isReadOnly} 
          veiculos={veiculos} 
          limiteAnosTVDE={limiteAnosTVDE} 
          categoriasSelecionadas={categoriasSelecionadas} 
          handleCategoriaToggle={handleCategoriaToggle} 
        />
      )}

      {/* SUB-MODAL 2: Atribuições de Operação (Regime, Proprietário, Condutores, Via Verde) */}
      {modalAtribuicoesAberto && (
        <ModalAtribuicoes 
          isOpen={modalAtribuicoesAberto} 
          onClose={() => setModalAtribuicoesAberto(false)} 
          formData={formData} 
          setFormData={setFormData} 
          isReadOnly={isReadOnly} 
          initialData={initialData} 
          proprietarios={proprietarios} 
          motoristas={motoristas} 
          aparelhosAtivos={aparelhosAtivos} 
          onCriarProprietario={onCriarProprietario} 
          onCriarMotorista={onCriarMotorista} 
        />
      )}

      {/* SUB-MODAL 3: Tarifas & Catálogo */}
      {modalTarifasAberto && (
        <ModalTarifas 
          isOpen={modalTarifasAberto} 
          onClose={() => setModalTarifasAberto(false)} 
          formData={formData} 
          setFormData={setFormData} 
          isReadOnly={isReadOnly} 
        />
      )}

      {/* SUB-MODAL 4: Documentação Digital */}
      {modalDocumentosAberto && (
        <ModalDocumentos 
          isOpen={modalDocumentosAberto} 
          onClose={() => setModalDocumentosAberto(false)} 
          formData={formData} 
          setFormData={setFormData} 
          isReadOnly={isReadOnly} 
        />
      )}

      {/* SUB-MODAL 5: Conta Corrente & Ajustes */}
      {modalContaCorrenteAberto && (
        <ModalContaCorrente 
          isOpen={modalContaCorrenteAberto} 
          onClose={() => setModalContaCorrenteAberto(false)} 
          formData={formData} 
          isReadOnly={isReadOnly} 
          movimentos={movimentos} 
          setMovimentos={setMovimentos} 
          userData={userData} 
          initialData={initialData} 
        />
      )}

      {/* SUB-MODAL 6: Cartões Consumo Vinculados */}
      {modalCartoesAberto && (
        <ModalCartoes 
          isOpen={modalCartoesAberto} 
          onClose={() => setModalCartoesAberto(false)} 
          cartoesAtribuidos={cartoesAtribuidos} 
        />
      )}

      {/* BOTÕES FIXOS NO RODAPÉ */}
      <div className="flex gap-3 mt-6 sticky bottom-0 bg-white pt-4 border-t border-slate-50">
        <Button variant="secondary" className="flex-1 h-10 text-xs" onClick={onCancel}>{isReadOnly ? 'Fechar' : 'Cancelar'}</Button>
        {initialData.id && (
          <Button type="button" variant="outline" className="flex-1 h-10 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={() => setModalFinanceiroAberto(true)}>💰 Gestão Financeira</Button>
        )}
        {!isReadOnly && <Button type="submit" className="flex-1 h-10 text-xs shadow-md">Guardar Veículo</Button>}
      </div>

      <ModalFinanceiro isOpen={modalFinanceiroAberto} onClose={() => setModalFinanceiroAberto(false)} entidadeId={initialData.id} tipoEntidade="veiculo" nomeEntidade={formData.matricula || initialData.matricula || 'Veículo'} />
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES SUB-MODAIS AUXILIARES (Refatoração para modularização de código)
// ─────────────────────────────────────────────────────────────────────────────

function ModalIdentificacao({ isOpen, onClose, formData, setFormData, isReadOnly, veiculos, limiteAnosTVDE, categoriasSelecionadas, handleCategoriaToggle }) {
  const inputClass = `w-full py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none transition-all text-xs ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;

  const sugeridas = useMemo(() => {
    if (!veiculos || veiculos.length === 0) return [];
    const contagem = {};
    veiculos.forEach(v => { if (v.marca) { const m = v.marca.trim().toUpperCase(); contagem[m] = (contagem[m] || 0) + 1; } });
    const ordenadas = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 10).map(par => par[0]);
    return ordenadas.map(marca => TODAS_AS_MARCAS.find(m => m.toUpperCase() === marca) || marca);
  }, [veiculos]);

  const popularesFiltradas = useMemo(() => {
    return POPULARES_ESTATICOS.filter(marca => !sugeridas.some(s => s.toUpperCase() === marca.toUpperCase()));
  }, [sugeridas]);

  const restantesFiltradas = useMemo(() => {
    return TODAS_AS_MARCAS.filter(marca => !sugeridas.some(s => s.toUpperCase() === marca.toUpperCase()) && !popularesFiltradas.some(p => p.toUpperCase() === marca.toUpperCase()));
  }, [sugeridas, popularesFiltradas]);

  const tempoRestanteTVDE = useMemo(() => {
    return calcularTempoRestanteTVDE(formData.dataPrimeiraMatricula, limiteAnosTVDE);
  }, [formData.dataPrimeiraMatricula, limiteAnosTVDE]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none"><Car size={18} className="text-blue-500" /> Identificação & Especificações</h3>
        
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Matrícula *</label><input required readOnly={isReadOnly} placeholder="AA-00-AA" className={`${inputClass} uppercase font-bold text-center tracking-widest`} value={formData.matricula} onChange={(e) => setFormData({...formData, matricula: formatMatricula(e.target.value)})} /></div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Marca</label>
              {isReadOnly ? <input readOnly className={inputClass} value={formData.marca} /> : (
                <select className={inputClass} value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})}>
                  <option value="">Selecione...</option>
                  {sugeridas.length > 0 && <optgroup label="✨ Sugeridos">{sugeridas.map(m => <option key={`sug-${m}`} value={m}>{m}</option>)}</optgroup>}
                  <optgroup label="🔥 Populares">{popularesFiltradas.map(m => <option key={`pop-${m}`} value={m}>{m}</option>)}</optgroup>
                  <optgroup label="📋 Todas (A-Z)">{restantesFiltradas.map(m => <option key={`all-${m}`} value={m}>{m}</option>)}</optgroup>
                </select>
              )}
            </div>
            <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Modelo</label><input readOnly={isReadOnly} className={inputClass} value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} /></div>
            <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Ano</label><input type="number" readOnly={isReadOnly} className={inputClass} value={formData.ano} onChange={(e) => setFormData({...formData, ano: e.target.value})} /></div>
          </div>
          <div>
            <DatePicker label="Data da Primeira Matrícula *" value={formData.dataPrimeiraMatricula} onChange={(val) => setFormData({...formData, dataPrimeiraMatricula: val})} isReadOnly={isReadOnly} />
            {formData.dataPrimeiraMatricula && tempoRestanteTVDE && (
              <div className={`mt-2.5 p-3 rounded-xl text-xs font-bold border flex items-center gap-2 select-none animate-in fade-in ${tempoRestanteTVDE.expirado ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                {tempoRestanteTVDE.expirado ? <AlertCircle size={14} /> : <Sparkles size={14} />}
                <div className="flex-1">
                  <p className="font-black">{tempoRestanteTVDE.texto}</p>
                  <p className="text-[10px] opacity-80 font-medium">Limite regulamentar de {limiteAnosTVDE} anos para circulação de viaturas nas aplicações.</p>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Combustível</label>
            <select disabled={isReadOnly} className={inputClass} value={formData.combustivel} onChange={(e) => setFormData({...formData, combustivel: e.target.value})}>
              <option value="Gasóleo">⛽ Gasóleo (Diesel)</option>
              <option value="Gasolina">⛽ Gasolina</option>
              <option value="Elétrico">⚡ Elétrico</option>
              <option value="GPL">GPL</option>
              <option value="Híbrido">🔋 Híbrido</option>
            </select>
          </div>
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <label className="block text-[9px] font-black text-slate-400 uppercase ml-1">Categorias Ativas nas Aplicações</label>
            <div className="flex flex-wrap gap-2">
              {['Standard', 'Green', 'Comfort', 'XL', 'Black'].map((cat) => {
                const ativo = categoriasSelecionadas.includes(cat);
                return (
                  <button key={cat} type="button" disabled={isReadOnly} onClick={() => handleCategoriaToggle(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${ativo ? 'bg-blue-600 border-blue-600 text-white shadow-sm hover:bg-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ativo ? 'bg-white' : 'bg-slate-300'}`} />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end shrink-0">
          <Button type="button" onClick={onClose} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
        </div>
      </div>
    </div>
  );
}

function ModalAtribuicoes({ isOpen, onClose, formData, setFormData, isReadOnly, initialData, proprietarios, motoristas, aparelhosAtivos, onCriarProprietario, onCriarMotorista }) {
  const inputClass = `w-full py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none transition-all text-xs ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;
  
  const [modoProprietario, setModoProprietario] = useState('existente');
  const [modoMotorista, setModoMotorista] = useState('existente');
  const [novoProprietario, setNovoProprietario] = useState({ nome: '', nif: '', telemovel: '' });
  const [novoMotorista, setNovoMotorista] = useState({ nome: '', nif: '', telemovel: '' });

  const obterViaVerdeDoMotorista = (motoristaId) => {
    if (!motoristaId) return null;
    return aparelhosAtivos.find(a => a.motoristaId === motoristaId);
  };

  const criarProprietarioInline = async () => {
    if (!novoProprietario.nome) return;
    const novoId = await onCriarProprietario(novoProprietario);
    setFormData({...formData, proprietarioId: novoId, proprietarioNome: novoProprietario.nome});
    setModoProprietario('existente');
  };

  const criarMotoristaInline = async () => {
    if (!novoMotorista.nome) return;
    const novoId = await onCriarMotorista(novoMotorista);
    setFormData({...formData, motoristaId: novoId, motoristaNome: novoMotorista.nome});
    setModoMotorista('existente');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none"><Users size={18} className="text-blue-500" /> Atribuições de Operação</h3>
        
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Regime de Aluguer</label>
            <select disabled={isReadOnly} className={inputClass} value={formData.tipoAluguer} onChange={(e) => setFormData({...formData, tipoAluguer: e.target.value, ...(e.target.value === 'integral' ? { motoristaId2: '', motoristaNome2: '' } : {})})}>
              <option value="integral">👤 Período Integral (24h — Condutor Único)</option>
              <option value="turnos">👥 Partilhado (Por Turnos — Até 2 Condutores)</option>
            </select>
          </div>

          {/* [NOVO] SWITCH INTELIGENTE DE PROPRIETÁRIO CONDUTOR [2] */}
          <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 select-none cursor-pointer">
                <UserCheck size={14} className="text-emerald-600 shrink-0" />
                Proprietário Condutor
              </label>
              <p className="text-[10px] text-slate-400 leading-tight">Ative se o proprietário legal for o próprio motorista principal.</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, proprietarioCondutor: !prev.proprietarioCondutor }))}
              className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.proprietarioCondutor ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                formData.proprietarioCondutor ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Secção do Proprietário: Renderizado de acordo com o switch de proprietário condutor */}
          {!formData.proprietarioCondutor ? (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Proprietário / Operador</label>
              {!isReadOnly && !initialData.id && (
                <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1 w-fit select-none">
                  <button type="button" onClick={() => setModoProprietario('existente')} className={`px-4 py-1 text-xs font-bold rounded transition-colors ${modoProprietario === 'existente' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>Existente</button>
                  <button type="button" onClick={() => setModoProprietario('novo')} className={`px-4 py-1 text-xs font-bold rounded transition-colors ${modoProprietario === 'novo' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>+ Novo</button>
                </div>
              )}
              {modoProprietario === 'existente' ? (
                <select disabled={isReadOnly} className={inputClass} value={formData.proprietarioId} onChange={(e) => { const p = proprietarios.find(p => p.id === e.target.value); setFormData({...formData, proprietarioId: e.target.value, proprietarioNome: p?.nome || ''}); }}>
                  <option value="">Selecione...</option>
                  {proprietarios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              ) : (
                <div className="space-y-2 bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                  <input placeholder="Nome completo *" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white" value={novoProprietario.nome} onChange={(e) => setNovoProprietario({ ...novoProprietario, nome: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="NIF" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono" value={novoProprietario.nif} onChange={(e) => setNovoProprietario({ ...novoProprietario, nif: e.target.value })} />
                    <input placeholder="Telemóvel" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white" value={novoProprietario.telemovel} onChange={(e) => setNovoProprietario({ ...novoProprietario, telemovel: e.target.value })} />
                  </div>
                  <button type="button" onClick={criarProprietarioInline} className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm">Confirmar Proprietário</button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/30 rounded-xl border border-dashed border-emerald-200 select-none animate-in fade-in duration-200">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block mb-1">Proprietário Vinculado</span>
              <p className="text-xs font-extrabold text-slate-800">
                👤 {formData.motoristaNome || "Aguardando seleção do motorista..."}
              </p>
              <p className="text-[9.5px] text-slate-400 mt-1 leading-tight">Os dados fiscais do proprietário foram sincronizados em tempo real com o motorista principal devido ao regime de Proprietário Condutor.</p>
            </div>
          )}

          {/* Secção dos Condutores */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {formData.tipoAluguer === 'integral' ? 'Condutor Associado' : 'Condutores por Turno (Partilhado)'}
            </label>
            
            {formData.tipoAluguer === 'integral' ? (
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Motorista Habitual (24h)</label>
                {!isReadOnly && !initialData.id && (
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1 w-fit select-none">
                    <button type="button" onClick={() => setModoMotorista('existente')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${modoMotorista === 'existente' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>Existente</button>
                    <button type="button" onClick={() => setModoMotorista('novo')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${modoMotorista === 'novo' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>+ Novo</button>
                  </div>
                )}
                {modoMotorista === 'existente' ? (
                  <div className="space-y-1.5">
                    <select disabled={isReadOnly} className={inputClass} value={formData.motoristaId} onChange={(e) => { const m = motoristas.find(m => m.id === e.target.value); setFormData({...formData, motoristaId: e.target.value, motoristaNome: m?.nome || ''}); }}>
                      <option value="">Disponível</option>
                      {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                    {(() => {
                      const vv = obterViaVerdeDoMotorista(formData.motoristaId);
                      return vv ? (
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-800 text-[10px] animate-in fade-in duration-200">
                          <Radio size={12} className="text-emerald-600 animate-pulse shrink-0" />
                          <span>Via Verde Ativa: <strong className="font-mono">{vv.numeroAparelho}</strong></span>
                        </div>
                      ) : formData.motoristaId ? (
                        <div className="p-2 bg-slate-100/50 rounded-xl border border-slate-200/50 flex items-center gap-2 text-slate-400 text-[10px] animate-in fade-in duration-200">
                          <Radio size={12} className="text-slate-300 shrink-0" />
                          <span className="italic font-medium">Sem identificador Via Verde pessoal associado</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2 bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                    <input placeholder="Nome completo *" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white" value={novoMotorista.nome} onChange={(e) => setNovoMotorista({ ...novoMotorista, nome: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="NIF" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono" value={novoMotorista.nif} onChange={(e) => setNovoMotorista({ ...novoMotorista, nif: e.target.value })} />
                      <input placeholder="Telemóvel" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white" value={novoMotorista.telemovel} onChange={(e) => setNovoMotorista({ ...novoMotorista, telemovel: e.target.value })} />
                    </div>
                    <button type="button" onClick={criarMotoristaInline} className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm">Confirmar Motorista</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Turno A (Diurno)</label>
                  <select disabled={isReadOnly} className={inputClass} value={formData.motoristaId} onChange={(e) => { const m = motoristas.find(m => m.id === e.target.value); setFormData({...formData, motoristaId: e.target.value, motoristaNome: m?.nome || ''}); }}>
                    <option value="">Disponível</option>
                    {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  {(() => {
                    const vv = obterViaVerdeDoMotorista(formData.motoristaId);
                    return vv ? (
                      <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-800 text-[10px] animate-in fade-in duration-200">
                        <Radio size={12} className="text-emerald-600 animate-pulse shrink-0" />
                        <span>Via Verde: <strong className="font-mono">{vv.numeroAparelho}</strong></span>
                      </div>
                    ) : formData.motoristaId ? (
                      <div className="p-2 bg-slate-100/50 rounded-xl border border-slate-200/50 flex items-center gap-2 text-slate-400 text-[10px] animate-in fade-in duration-200">
                        <Radio size={12} className="text-slate-300 shrink-0" />
                        <span className="italic font-medium">Sem Via Verde</span>
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Turno B (Noturno)</label>
                  <select disabled={isReadOnly} className={inputClass} value={formData.motoristaId2 || ''} onChange={(e) => { const m = motoristas.find(m => m.id === e.target.value); setFormData({...formData, motoristaId2: e.target.value, motoristaNome2: m?.nome || ''}); }}>
                    <option value="">Disponível</option>
                    {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  {(() => {
                    const vv = obterViaVerdeDoMotorista(formData.motoristaId2);
                    return vv ? (
                      <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-800 text-[10px] animate-in fade-in duration-200">
                        <Radio size={12} className="text-emerald-600 animate-pulse shrink-0" />
                        <span>Via Verde: <strong className="font-mono">{vv.numeroAparelho}</strong></span>
                      </div>
                    ) : formData.motoristaId2 ? (
                      <div className="p-2 bg-slate-100/50 rounded-xl border border-slate-200/50 flex items-center gap-2 text-slate-400 text-[10px] animate-in fade-in duration-200">
                        <Radio size={12} className="text-slate-300 shrink-0" />
                        <span className="italic font-medium">Sem Via Verde</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end shrink-0">
          <Button type="button" onClick={onClose} className="px-6 h-10 text-xs shadow-md">Confirmar e Fechar</Button>
        </div>
      </div>
    </div>
  );
}

function ModalTarifas({ isOpen, onClose, formData, setFormData, isReadOnly }) {
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

function ModalDocumentos({ isOpen, onClose, formData, setFormData, isReadOnly }) {
  const DocumentCardLocal = ({ label, fileUrl, dateField, folder, uploadField }) => (
    <div className={`p-3 rounded-2xl border transition-all text-left flex flex-col h-full ${fileUrl ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300'}`}>
      <div className="flex justify-between items-start mb-2 shrink-0">
        <div className="flex items-center gap-2">
          {fileUrl ? <CheckCircle2 size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-slate-300" />}
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{label}</span>
        </div>
        {fileUrl && (
          <div className="flex gap-1 select-none">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-tvde-primary hover:bg-slate-100 rounded transition-all"><Eye size={12} /></a>
            {!isReadOnly && <button type="button" onClick={() => { if (window.confirm("Remover ficheiro?")) setFormData({...formData, [uploadField]: ''}); }} className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition-all"><Trash2 size={12} /></button>}
          </div>
        )}
      </div>
      
      {fileUrl && uploadField === "fotoUrl" && (
        <div className="my-2 w-full h-24 rounded-xl overflow-hidden border border-slate-100 bg-slate-100 flex items-center justify-center shrink-0">
          <img src={fileUrl} alt="Viatura" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="mt-auto space-y-2">
        {!isReadOnly && !fileUrl && <FileUpload label="Carregar" folder={folder} onUploadComplete={(url) => setFormData({...formData, [uploadField]: url})} />}
        {dateField && <div className="pt-1.5 border-t border-slate-100"><DatePicker label="Validade" value={formData[dateField]} onChange={(val) => setFormData({...formData, [dateField]: val})} isReadOnly={isReadOnly} /></div>}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none"><FileText size={18} className="text-blue-500" /> Documentação & Foto da Viatura</h3>
        
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DocumentCardLocal label="DUA" folder="veiculos/dua" uploadField="docDUA" fileUrl={formData.docDUA} />
            <DocumentCardLocal label="Seguro" folder="veiculos/seguros" uploadField="docSeguro" fileUrl={formData.docSeguro} dateField="validadeSeguro" />
            <DocumentCardLocal label="IPO" folder="veiculos/ipo" uploadField="docIPO" fileUrl={formData.docIPO} dateField="validadeIPO" />
            <DocumentCardLocal label="Foto da Viatura" folder="veiculos/fotos" uploadField="fotoUrl" fileUrl={formData.fotoUrl} />
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end shrink-0">
          <Button type="button" onClick={onClose} className="px-6 h-10 text-xs shadow-md">Confirmar e Fechar</Button>
        </div>
      </div>
    </div>
  );
}

function ModalContaCorrente({ isOpen, onClose, formData, isReadOnly, movimentos, setMovimentos, userData, initialData }) {
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
    } catch (error) { console.error("Erro ao lançar movimento:", error); }
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

function ModalCartoes({ isOpen, onClose, cartoesAtribuidos }) {
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
                <div className="text-[11px] font-black text-slate-800 bg-white/50 px-2 py-0.5 rounded border border-white">PIN: {c.pin}</div>
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