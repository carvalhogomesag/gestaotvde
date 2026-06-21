/**
 * VeiculoForm.jsx
 * Localização: src/features/veiculos/VeiculoForm.jsx
 *
 * Formulário de edição e criação de viaturas.
 * Atualizado com suporte a carregamento de fotografia do veículo, tarifa semanal, região, combustível e categoria múltipla.
 * 
 * [NOVA UX UNIFICADA]:
 * - Migrado integralmente para a arquitetura de grelha de botões táteis com sub-modais de UX.
 * - Histórico de alterações formatado com data e hora detalhadas no padrão PT-PT.
 * - Preservação total das ações de criação inline de Motoristas/Proprietários e Sincronização.
 * - Suporte a Regimes de Aluguer: Integral (1 Condutor) ou Partilhado por Turnos (2 Condutores).
 * - Dropdown de Marcas inteligente exibindo até as 10 marcas mais registadas na frota no topo.
 * - [NOVO] Adição de Data da Primeira Matrícula e cálculo dinâmico de tempo de circulação TVDE restante.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Car, Users, FileText, Eye, Trash2, 
  CheckCircle2, AlertCircle, Calendar, ShieldCheck, ClipboardCheck, History,
  Wallet, Plus, Euro, ChevronDown, ChevronUp, Image as ImageIcon, MapPin, X, ArrowRight, Sparkles
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

// Listas Estáticas fora do ciclo de render do componente
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
 * [NOVO] Algoritmo de cálculo legal de tempo restante para circulação TVDE
 */
const calcularTempoRestanteTVDE = (dataPrimeiraMatricula, limiteAnos = 7) => {
  if (!dataPrimeiraMatricula) return null;
  
  const dataMatricula = new Date(dataPrimeiraMatricula);
  const dataLimite = new Date(dataMatricula);
  dataLimite.setFullYear(dataMatricula.getFullYear() + Number(limiteAnos));
  
  const hoje = new Date();
  
  // Calcular diferenças de calendário precisas
  let anos = dataLimite.getFullYear() - hoje.getFullYear();
  let meses = dataLimite.getMonth() - hoje.getMonth();
  let dias = dataLimite.getDate() - hoje.getDate();
  
  if (dias < 0) {
    meses--;
    const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
    dias += ultimoDiaMesAnterior;
  }
  
  if (meses < 0) {
    anos--;
    meses += 12;
  }
  
  const totalDias = Math.ceil((dataLimite - hoje) / (1000 * 60 * 60 * 24));
  
  if (totalDias <= 0) {
    return { expirado: true, texto: "Excedeu o limite regulamentar de circulação TVDE" };
  }
  
  let partes = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  if (dias > 0 && partes.length < 2) partes.push(`${dias} ${dias === 1 ? 'dia' : 'dias'}`);
  
  return { 
    expirado: false, 
    texto: `Faltam: ${partes.join(' e ')}`, 
    totalDias 
  };
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

export default function VeiculoForm({ 
  onSubmit, 
  initialData = {}, 
  motoristas = [], 
  proprietarios = [], 
  cartoes = [], 
  veiculos = [], // Array de viaturas registadas vindo do orquestrador
  limiteAnosTVDE = 7, // [NOVO] Limite regulamentar configurável (padrão legal: 7 anos)
  onCancel, 
  isReadOnly = false, 
  onCriarProprietario, 
  onCriarMotorista 
}) {
  const { userData } = useAuth();
  
  // ESTADO CENTRAL DO FORMULÁRIO (Matrícula, Tarifa, Região, Regime de Aluguer e Motoristas)
  const [formData, setFormData] = useState({
    marca: initialData.marca || '', 
    modelo: initialData.modelo || '', 
    matricula: initialData.matricula || '', 
    ano: initialData.ano || '',
    dataPrimeiraMatricula: initialData.dataPrimeiraMatricula || '', // [NOVO]
    proprietarioId: initialData.proprietarioId || '', 
    proprietarioNome: initialData.proprietarioNome || '', 
    // Regime de Aluguer ('integral' ou 'turnos')
    tipoAluguer: initialData.tipoAluguer || 'integral',
    // Turno Diurno / Único (1)
    motoristaId: initialData.motoristaId || '',
    motoristaNome: initialData.motoristaNome || '', 
    // Turno Noturno (2)
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
    categoria: initialData.categoria || 'Standard' 
  });

  // Estado local para gerir os botões de categorias ativas (Checkbox múltipla)
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState(
    initialData.categoria 
      ? initialData.categoria.split(' / ').map(c => c.trim()) 
      : ['Standard']
  );

  const [movimentos, setMovimentos] = useState([]);
  const [novoMovimento, setNovoMovimento] = useState({ tipo: 'debito', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] });
  const [modoProprietario, setModoProprietario] = useState('existente');
  const [modoMotorista, setModoMotorista] = useState('existente');
  const [novoProprietario, setNovoProprietario] = useState({ nome: '', nif: '', telemovel: '' });
  const [novoMotorista, setNovoMotorista] = useState({ nome: '', nif: '', telemovel: '' });
  const [modalFinanceiroAberto, setModalFinanceiroAberto] = useState(false);

  // Estados de abertura para os novos sub-modais de UX
  const [modalIdentificacaoAberto, setModalIdentificacaoAberto] = useState(false);
  const [modalAtribuicoesAberto, setModalAtribuicoesAberto] = useState(false);
  const [modalTarifasAberto, setModalTarifasAberto] = useState(false);
  const [modalDocumentosAberto, setModalDocumentosAberto] = useState(false);
  const [modalContaCorrenteAberto, setModalContaCorrenteAberto] = useState(false);
  const [modalCartoesAberto, setModalCartoesAberto] = useState(false);

  // Sincroniza a seleção múltipla de categorias TVDE
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      categoria: categoriasSelecionadas.join(' / ')
    }));
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

  // ALGORITMO DEDUPICADO PARA ATÉ 10 SUGESTÕES
  const sugeridas = useMemo(() => {
    if (!veiculos || veiculos.length === 0) return [];
    
    const contagem = {};
    veiculos.forEach(v => {
      if (v.marca) {
        const marcaNormalizada = v.marca.trim().toUpperCase();
        contagem[marcaNormalizada] = (contagem[marcaNormalizada] || 0) + 1;
      }
    });

    const ordenadas = Object.entries(contagem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(par => par[0]);

    return ordenadas.map(marca => 
      TODAS_AS_MARCAS.find(m => m.toUpperCase() === marca) || marca
    );
  }, [veiculos]);

  // Filtra marcas populares padrão tirando as que já constam nos sugeridos
  const popularesFiltradas = useMemo(() => {
    return POPULARES_ESTATICOS.filter(
      marca => !sugeridas.some(s => s.toUpperCase() === marca.toUpperCase())
    );
  }, [sugeridas]);

  // Filtra a lista completa tirando marcas sugeridas e marcas populares
  const restantesFiltradas = useMemo(() => {
    return TODAS_AS_MARCAS.filter(
      marca => !sugeridas.some(s => s.toUpperCase() === marca.toUpperCase()) &&
               !popularesFiltradas.some(p => p.toUpperCase() === marca.toUpperCase())
    );
  }, [sugeridas, popularesFiltradas]);

  // [NOVO] Cálculo em tempo real do tempo regulamentar restante
  const tempoRestanteTVDE = useMemo(() => {
    return calcularTempoRestanteTVDE(formData.dataPrimeiraMatricula, limiteAnosTVDE);
  }, [formData.dataPrimeiraMatricula, limiteAnosTVDE]);

  const handleCategoriaToggle = (cat) => {
    setCategoriasSelecionadas(prev => {
      if (prev.includes(cat)) {
        const filtrado = prev.filter(c => c !== cat);
        return filtrado.length === 0 ? ['Standard'] : filtrado;
      } else {
        return [...prev, cat];
      }
    });
  };

  /**
   * Altera o tipo de aluguer e limpa o motorista do Turno B 
   * se reverter para "Período Integral" (24h)
   */
  const handleTipoAluguerChange = (tipo) => {
    setFormData(prev => ({
      ...prev,
      tipoAluguer: tipo,
      ...(tipo === 'integral' ? { motoristaId2: '', motoristaNome2: '' } : {})
    }));
  };

  const handleAddMovimento = async () => {
    if (!novoMovimento.valor || !novoMovimento.descricao) {
      alert("Por favor, preencha o valor e a descrição do lançamento.");
      return;
    }
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
    } catch (error) { alert("Erro ao lançar movimento."); }
  };

  const handleDeleteMovimento = async (m) => {
    if (window.confirm("Eliminar este lançamento financeiro?")) {
      await deleteDoc(doc(db, "movimentos_financeiros", m.id));
      await logAcaoGlobal(userData.nome, "Eliminação Financeira", "Conta Corrente", m.descricao, m.id);
    }
  };

  const handleMatriculaChange = (e) => { 
    const formatted = formatMatricula(e.target.value); 
    setFormData({ ...formData, matricula: formatted }); 
  };
  
  const handleRemoveFile = (field) => { 
    if (window.confirm("Deseja remover este ficheiro?")) { 
      setFormData(prev => ({ ...prev, [field]: '' })); 
    } 
  };
  
  const inputClass = `w-full py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none transition-all text-xs ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;

  // Componente de carregamento de documentos com suporte a Thumbnail
  const DocumentCard = ({ label, fileUrl, dateField, folder, uploadField }) => (
    <div className={`p-3 rounded-2xl border transition-all text-left flex flex-col h-full ${fileUrl ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300'}`}>
      <div className="flex justify-between items-start mb-2 shrink-0">
        <div className="flex items-center gap-2">
          {fileUrl ? <CheckCircle2 size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-slate-300" />}
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{label}</span>
        </div>
        {fileUrl && (
          <div className="flex gap-1">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-blue-50 text-tvde-primary rounded-lg hover:bg-tvde-primary hover:text-white transition-all">
              <Eye size={12} />
            </a>
            {!isReadOnly && (
              <button type="button" onClick={() => handleRemoveFile(uploadField)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>
      
      {fileUrl && uploadField === "fotoUrl" && (
        <div className="my-2 w-full h-24 rounded-xl overflow-hidden border border-slate-100 bg-slate-100 flex items-center justify-center shrink-0">
          <img src={fileUrl} alt="Viatura" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="mt-auto space-y-2">
        {!isReadOnly && !fileUrl && (
          <FileUpload label="Carregar" folder={folder} onUploadComplete={(url) => setFormData({...formData, [uploadField]: url})} />
        )}
        {dateField && (
          <div className="pt-1.5 border-t border-slate-100">
            <DatePicker label="Validade" value={formData[dateField]} onChange={(val) => setFormData({...formData, [dateField]: val})} isReadOnly={isReadOnly} />
          </div>
        )}
      </div>
    </div>
  );

  const cartoesAtribuidos = cartoes.filter(c => c.veiculoId === initialData.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let dadosFinais = { ...formData };
    
    if (modoProprietario === 'novo' && novoProprietario.nome && onCriarProprietario) {
      const novoId = await onCriarProprietario(novoProprietario);
      dadosFinais.proprietarioId = novoId;
      dadosFinais.proprietarioNome = novoProprietario.nome;
    }
    
    if (modoMotorista === 'novo' && novoMotorista.nome && onCriarMotorista) {
      const novoId = await onCriarMotorista(novoMotorista);
      dadosFinais.motoristaId = novoId;
      dadosFinais.motoristaNome = novoMotorista.nome;
    }
    
    onSubmit(dadosFinais);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-1 max-h-[75vh] overflow-y-auto pr-3.5 custom-scrollbar">
      
      {/* GRELHA DE BOTÕES TÁTEIS DO VEÍCULO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
        
        {/* Botão 1: Identificação & Especificações */}
        <button
          type="button"
          onClick={() => setModalIdentificacaoAberto(true)}
          className="p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
              <Car size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Identificação & Especificações</p>
              <p className="text-[9.5px] text-slate-400 truncate">Matrícula, Marca, Modelo, Categorias e Ano.</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {/* Botão 2: Atribuições de Operação */}
        <button
          type="button"
          onClick={() => setModalAtribuicoesAberto(true)}
          className="p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
              <Users size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Atribuições de Operação</p>
              <p className="text-[9.5px] text-slate-400 truncate">Regime, Proprietário e Condutores associados.</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {/* Botão 3: Tarifas & Catálogo */}
        <button
          type="button"
          onClick={() => setModalTarifasAberto(true)}
          className="p-2.5 bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
              <Euro size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Tarifas & Catálogo</p>
              <p className="text-[9.5px] text-slate-400 truncate">Tarifa semanal e região no catálogo público.</p>
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
              <FileText size={16} />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800">Documentação & Foto</p>
              <p className="text-[9.5px] text-slate-400 truncate">DUA, apólice de Seguro, IPO e Foto Real.</p>
            </div>
          </div>
          <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
        </button>

        {/* Botão 5: Conta Corrente & Ajustes */}
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
                <p className="text-[9.5px] text-slate-400 truncate">Histórico financeiro, cauções e lançamentos.</p>
              </div>
            </div>
            <ArrowRight size={12} className="text-slate-300 group-hover:text-tvde-primary transition-colors shrink-0" />
          </button>
        )}

        {/* Botão 6: Cartões Consumo Vinculados */}
        {initialData.id && (
          <button
            type="button"
            onClick={() => setModalCartoesAberto(true)}
            className="p-2.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform shrink-0">
                <CreditCard size={16} />
              </div>
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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalIdentificacaoAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalIdentificacaoAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <Car size={18} className="text-blue-500" /> Identificação & Especificações
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Matrícula *</label><input required readOnly={isReadOnly} placeholder="AA-00-AA" className={`${inputClass} uppercase font-bold text-center tracking-widest`} value={formData.matricula} onChange={handleMatriculaChange} /></div>
                
                {/* [Dropdown Inteligente para Marcas - Expandido para 10] */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Marca</label>
                  {isReadOnly ? (
                    <input readOnly className={inputClass} value={formData.marca} />
                  ) : (
                    <select
                      className={inputClass}
                      value={formData.marca}
                      onChange={(e) => setFormData({...formData, marca: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      
                      {sugeridas.length > 0 && (
                        <optgroup label="✨ Sugeridos (Mais Registados)">
                          {sugeridas.map(m => (
                            <option key={`sug-${m}`} value={m}>{m}</option>
                          ))}
                        </optgroup>
                      )}
                      
                      <optgroup label="🔥 Marcas Populares">
                        {popularesFiltradas.map(m => (
                          <option key={`pop-${m}`} value={m}>{m}</option>
                        ))}
                      </optgroup>
                      
                      <optgroup label="📋 Todas as Marcas (A-Z)">
                        {restantesFiltradas.map(m => (
                          <option key={`all-${m}`} value={m}>{m}</option>
                        ))}
                      </optgroup>
                    </select>
                  )}
                </div>

                <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Modelo</label><input readOnly={isReadOnly} className={inputClass} value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} /></div>
                <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Ano</label><input type="number" readOnly={isReadOnly} className={inputClass} value={formData.ano} onChange={(e) => setFormData({...formData, ano: e.target.value})} /></div>
              </div>

              {/* [NOVO] Seletor de Data da Primeira Matrícula & Cálculo do Tempo Restante */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                <div>
                  <DatePicker 
                    label="Data da Primeira Matrícula *" 
                    value={formData.dataPrimeiraMatricula} 
                    onChange={(val) => setFormData({...formData, dataPrimeiraMatricula: val})} 
                    isReadOnly={isReadOnly} 
                  />
                  {formData.dataPrimeiraMatricula && tempoRestanteTVDE && (
                    <div className={`mt-2.5 p-3 rounded-xl text-xs font-bold border flex items-center gap-2 select-none animate-in fade-in duration-200 ${tempoRestanteTVDE.expirado ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                      {tempoRestanteTVDE.expirado ? <AlertCircle size={14} className="shrink-0" /> : <Sparkles size={14} className="shrink-0" />}
                      <div className="flex-1">
                        <p className="font-black">{tempoRestanteTVDE.texto}</p>
                        <p className="text-[10px] opacity-80 font-medium">Limite legal configurado em {limiteAnosTVDE} anos para circulação de viaturas nas plataformas TVDE.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Tipo de Combustível</label>
                <select disabled={isReadOnly} className={inputClass} value={formData.combustivel} onChange={(e) => setFormData({...formData, combustivel: e.target.value})}>
                  <option value="Gasóleo">⛽ Gasóleo (Diesel)</option>
                  <option value="Gasolina">⛽ Gasolina</option>
                  <option value="Elétrico">⚡ Elétrico</option>
                  <option value="GPL">GPL</option>
                  <option value="Híbrido">🔋 Híbrido</option>
                </select>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-2 text-left">
                <label className="block text-[9px] font-black text-slate-400 uppercase ml-1">Categorias Ativas nas Aplicações (Uber / Bolt)</label>
                <div className="flex flex-wrap gap-2 select-none">
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
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalIdentificacaoAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: Atribuições de Operação (Regime, Proprietário e Condutores por Turno) */}
      {modalAtribuicoesAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalAtribuicoesAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalAtribuicoesAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <Users size={18} className="text-blue-500" /> Atribuições de Operação
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Regime / Tipo de Aluguer */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Regime de Aluguer / Operação</label>
                <select 
                  disabled={isReadOnly}
                  className={inputClass}
                  value={formData.tipoAluguer || 'integral'}
                  onChange={(e) => handleTipoAluguerChange(e.target.value)}
                >
                  <option value="integral">👤 Período Integral (24h — Condutor Único)</option>
                  <option value="turnos">👥 Partilhado (Por Turnos — Até 2 Condutores)</option>
                </select>
              </div>

              {/* Secção do Proprietário */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Proprietário / Operador</label>
                {!isReadOnly && !initialData.id && (
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1 w-fit">
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
                  <div className="space-y-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <input placeholder="Nome completo *" required className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={novoProprietario.nome} onChange={(e) => setNovoProprietario({ ...novoProprietario, nome: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="NIF" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-mono" value={novoProprietario.nif} onChange={(e) => setNovoProprietario({ ...novoProprietario, nif: e.target.value })} />
                      <input placeholder="Telemóvel" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={novoProprietario.telemovel} onChange={(e) => setNovoProprietario({ ...novoProprietario, telemovel: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>

              {/* [DINÂMICO] Secção dos Condutores baseada no Regime */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {formData.tipoAluguer === 'integral' ? 'Condutor Associado' : 'Condutores por Turno (Partilhado)'}
                </label>
                
                {formData.tipoAluguer === 'integral' ? (
                  /* Regime Integral: Apenas 1 condutor habitual */
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider">Motorista Habitual (24h)</label>
                    {!isReadOnly && !initialData.id && (
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1 w-fit">
                        <button type="button" onClick={() => setModoMotorista('existente')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${modoMotorista === 'existente' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>Existente</button>
                        <button type="button" onClick={() => setModoMotorista('novo')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${modoMotorista === 'novo' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>+ Novo</button>
                      </div>
                    )}
                    {modoMotorista === 'existente' ? (
                      <select disabled={isReadOnly} className={inputClass} value={formData.motoristaId} onChange={(e) => { const m = motoristas.find(m => m.id === e.target.value); setFormData({...formData, motoristaId: e.target.value, motoristaNome: m?.nome || ''}); }}>
                        <option value="">Disponível</option>
                        {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                      </select>
                    ) : (
                      <div className="space-y-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <input placeholder="Nome completo *" required className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={novoMotorista.nome} onChange={(e) => setNovoMotorista({ ...novoMotorista, nome: e.target.value })} />
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="NIF" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-mono" value={novoMotorista.nif} onChange={(e) => setNovoMotorista({ ...novoMotorista, nif: e.target.value })} />
                          <input placeholder="Telemóvel" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={novoMotorista.telemovel} onChange={(e) => setNovoMotorista({ ...novoMotorista, telemovel: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Regime Partilhado: Diurno (A) e Noturno (B) */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Turno Diurno (A) */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Motorista Diurno — Turno A</label>
                      {!isReadOnly && !initialData.id && (
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1 w-fit">
                          <button type="button" onClick={() => setModoMotorista('existente')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${modoMotorista === 'existente' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>Existente</button>
                          <button type="button" onClick={() => setModoMotorista('novo')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${modoMotorista === 'novo' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>+ Novo</button>
                        </div>
                      )}
                      {modoMotorista === 'existente' ? (
                        <select disabled={isReadOnly} className={inputClass} value={formData.motoristaId} onChange={(e) => { const m = motoristas.find(m => m.id === e.target.value); setFormData({...formData, motoristaId: e.target.value, motoristaNome: m?.nome || ''}); }}>
                          <option value="">Disponível</option>
                          {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                        </select>
                      ) : (
                        <div className="space-y-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <input placeholder="Nome completo *" required className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={novoMotorista.nome} onChange={(e) => setNovoMotorista({ ...novoMotorista, nome: e.target.value })} />
                          <div className="grid grid-cols-2 gap-2">
                            <input placeholder="NIF" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-mono" value={novoMotorista.nif} onChange={(e) => setNovoMotorista({ ...novoMotorista, nif: e.target.value })} />
                            <input placeholder="Telemóvel" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={novoMotorista.telemovel} onChange={(e) => setNovoMotorista({ ...novoMotorista, telemovel: e.target.value })} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Turno Noturno (B) */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Motorista Noturno — Turno B</label>
                      <select disabled={isReadOnly} className={inputClass} value={formData.motoristaId2 || ''} onChange={(e) => { const m = motoristas.find(m => m.id === e.target.value); setFormData({...formData, motoristaId2: e.target.value, motoristaNome2: m?.nome || ''}); }}>
                        <option value="">Disponível</option>
                        {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                      </select>
                    </div>
                  </div>
                )}

              </div>

            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <Button type="button" onClick={() => setModalAtribuicoesAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: Tarifas & Catálogo */}
      {modalTarifasAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalTarifasAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalTarifasAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <Euro size={18} className="text-purple-600" /> Tarifas & Catálogo Público
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Tarifa Semanal (€)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">€</span>
                    <input type="number" placeholder="0.00" readOnly={isReadOnly} className={`${inputClass} pl-6`} value={formData.precoSemanal} onChange={(e) => setFormData({...formData, precoSemanal: e.target.value})} />
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
              <Button type="button" onClick={() => setModalTarifasAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 4: Documentação Digital */}
      {modalDocumentosAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalDocumentosAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalDocumentosAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <FileText size={18} className="text-blue-500" /> Documentação & Foto da Viatura
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DocumentCard label="DUA" folder="veiculos/dua" uploadField="docDUA" fileUrl={formData.docDUA} />
                <DocumentCard label="Seguro" folder="veiculos/seguros" uploadField="docSeguro" fileUrl={formData.docSeguro} dateField="validadeSeguro" />
                <DocumentCard label="IPO" folder="veiculos/ipo" uploadField="docIPO" fileUrl={formData.docIPO} dateField="validadeIPO" />
                <DocumentCard label="Foto da Viatura" folder="veiculos/fotos" uploadField="fotoUrl" fileUrl={formData.fotoUrl} />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <Button type="button" onClick={() => setModalDocumentosAberto(false)} className="px-6 h-10 text-xs shadow-md">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 5: Conta Corrente & Ajustes */}
      {modalContaCorrenteAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalContaCorrenteAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalContaCorrenteAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-indigo-700 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <Wallet size={18} className="text-indigo-600" /> Conta Corrente / Ajustes da Viatura
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {!isReadOnly && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="md:col-span-1">
                    <select className={inputClass} value={novoMovimento.tipo} onChange={(e) => setNovoMovimento({...novoMovimento, tipo: e.target.value})}>
                      <option value="debito">🔴 Débito</option>
                      <option value="credito">🟢 Crédito</option>
                    </select>
                  </div>
                  <div className="md:col-span-1 relative">
                    <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
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
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalContaCorrenteAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 6: Cartões Consumo Vinculados */}
      {modalCartoesAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalCartoesAberto(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
            <button type="button" onClick={() => setModalCartoesAberto(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black text-emerald-700 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none">
              <CreditCard size={18} className="text-emerald-600" /> Cartões Consumo Vinculados
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {cartoesAtribuidos.length > 0 ? cartoesAtribuidos.map(c => (
                  <div key={c.id} className={`flex items-center justify-between p-3.5 rounded-xl border ${c.tipo === 'combustivel' ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="text-[11px] font-bold text-slate-700">
                      {c.numero} <span className="opacity-50">({c.fornecedor})</span>
                    </div>
                    <div className="text-[11px] font-black text-slate-800 bg-white/50 px-2 py-0.5 rounded border border-white">
                      PIN: {c.pin}
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 italic p-2 col-span-2 text-center">Nenhum cartão associado.</p>
                )}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" onClick={() => setModalCartoesAberto(false)} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
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
        {!isReadOnly && <Button type="submit" className="flex-1 h-10 text-xs shadow-md">Guardar Veículo</Button>}
      </div>

      <ModalFinanceiro
        isOpen={modalFinanceiroAberto}
        onClose={() => setModalFinanceiroAberto(false)}
        entidadeId={initialData.id}
        tipoEntidade="veiculo"
        nomeEntidade={formData.matricula || initialData.matricula || 'Veículo'}
      />
    </form>
  );
}