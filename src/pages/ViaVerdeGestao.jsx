/**
 * ViaVerdeGestao.jsx
 * Localização: src/pages/ViaVerdeGestao.jsx
 *
 * Módulo administrativo de gestão de identificadores físicos Via Verde.
 * Garante a atribuição temporal de aparelhos diretamente aos motoristas (e não aos veículos),
 * servindo como a "verdade absoluta" para a imputação de portagens atrasadas.
 *
 * Otimizado com:
 * - [NOVA UX]: Substituído input datetime-local por campos divididos de Data e Hora com Atalhos Rápidos.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Radio, Plus, Search, Calendar, Clock, User, 
  Check, X, ShieldAlert, ArrowLeftRight, Trash2, 
  FileText, Settings, AlertCircle, RefreshCw, Car
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, query, onSnapshot, doc, 
  runTransaction, updateDoc, addDoc 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function ViaVerdeGestao() {
  const { userData } = useAuth();

  // Estados principais de sincronização
  const [aparelhos, setAparelhos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [headerSlot, setHeaderSlot] = useState(null);

  // Filtros de pesquisa
  const [filtroPesquisa, setFiltroPesquisa] = useState('');

  // Estados dos Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAtribuicaoModal, setShowAtribuicaoModal] = useState(false);
  const [showDevolucaoModal, setShowDevolucaoModal] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);

  // Estados de formulários e ações
  const [selectedAparelho, setSelectedAparelho] = useState(null);
  const [novoAparelhoNumero, setNovoAparelhoNumero] = useState('');
  const [selectedMotoristaId, setSelectedMotoristaId] = useState('');
  
  // [NOVO] Estados divididos para Atribuição
  const [dataAtribuicao, setDataAtribuicao] = useState('');
  const [horaAtribuicao, setHoraAtribuicao] = useState('');

  // [NOVO] Estados divididos para Devolução
  const [dataDevolucao, setDataDevolucao] = useState('');
  const [horaDevolucao, setHoraDevolucao] = useState('');

  const [justificacao, setJustificacao] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Localiza o slot dinâmico no cabeçalho do ERP
  useEffect(() => {
    const slot = document.getElementById('header-dynamic-slot');
    if (slot) {
      setHeaderSlot(slot);
    }
  }, []);

  // Monitorização de tecla Escape (ESC) para fechar todos os modais proativamente
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        fecharTodosModais();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Escuta os identificadores da Via Verde em tempo real
  useEffect(() => {
    const q = query(collection(db, "viaverde_aparelhos"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => b.id.localeCompare(a.id));
      setAparelhos(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Escuta os motoristas ativos em tempo real para possibilitar atribuições
  useEffect(() => {
    const q = query(collection(db, "motoristas"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMotoristas(list);
    });
    return () => unsubscribe();
  }, []);

  // Utilitário para formatar a data/hora para o padrão PT-PT exigido por auditoria
  const formatarDataPT = (dataString) => {
    if (!dataString) return '-';
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return dataString;
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
  };

  // [NOVO] Helper para obter a data local atual em Portugal (formato YYYY-MM-DD)
  const obterDataLocal = () => {
    const agora = new Date();
    const tzOffset = agora.getTimezoneOffset() * 60000;
    return (new Date(agora - tzOffset)).toISOString().split('T')[0];
  };

  // [NOVO] Helper para obter a hora local atual em Portugal (formato HH:MM)
  const obterHoraLocal = () => {
    const agora = new Date();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  };

  // [NOVO] Presets para o formulário de Atribuição
  const aplicarPresetAtribuicao = (preset) => {
    const hoje = obterDataLocal();
    if (preset === 'agora') {
      setDataAtribuicao(hoje);
      setHoraAtribuicao(obterHoraLocal());
    } else if (preset === 'turnoA') {
      setDataAtribuicao(hoje);
      setHoraAtribuicao('06:00');
    } else if (preset === 'turnoB') {
      setDataAtribuicao(hoje);
      setHoraAtribuicao('18:00');
    }
  };

  // [NOVO] Presets para o formulário de Devolução
  const aplicarPresetDevolucao = (preset) => {
    const hoje = obterDataLocal();
    if (preset === 'agora') {
      setDataDevolucao(hoje);
      setHoraDevolucao(obterHoraLocal());
    } else if (preset === 'turnoA') {
      setDataDevolucao(hoje);
      setHoraDevolucao('06:00');
    } else if (preset === 'turnoB') {
      setDataDevolucao(hoje);
      setHoraDevolucao('18:00');
    }
  };

  const fecharTodosModais = () => {
    setShowFormModal(false);
    setShowAtribuicaoModal(false);
    setShowDevolucaoModal(false);
    setShowHistoricoModal(false);
    setSelectedAparelho(null);
    setNovoAparelhoNumero('');
    setSelectedMotoristaId('');
    setJustificacao('');
    setDataAtribuicao('');
    setHoraAtribuicao('');
    setDataDevolucao('');
    setHoraDevolucao('');
  };

  /**
   * REGISTO DE APARELHO (TRANSACIONAL ATÓMICO)
   */
  const handleRegistarAparelho = async (e) => {
    e.preventDefault();
    if (!novoAparelhoNumero.trim() || novoAparelhoNumero.trim().length < 8) {
      alert("Por favor, introduza um número de identificador Via Verde válido (mínimo 8 dígitos).");
      return;
    }
    if (justificacao.trim().length < 5) {
      alert("A justificação do registo deve ter, no mínimo, 5 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const contadorRef = doc(db, "metadados", "contador_viaverde");
      let proximoIDFormatado = "";

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(contadorRef);
        let proximoNumero = 1;
        
        if (docSnap.exists()) {
          const dados = docSnap.data();
          proximoNumero = (dados.ultimoNumero || 0) + 1;
          transaction.update(contadorRef, { ultimoNumero: proximoNumero });
        } else {
          transaction.set(contadorRef, { ultimoNumero: 1 });
        }

        const numeroFormatado = String(proximoNumero).padStart(4, '0');
        proximoIDFormatado = `VV-${numeroFormatado}`;
      });

      const novoDocRef = doc(db, "viaverde_aparelhos", proximoIDFormatado);
      const novoObjeto = {
        id: proximoIDFormatado,
        numeroAparelho: novoAparelhoNumero.trim(),
        estado: 'Disponível',
        motoristaId: null,
        nomeMotorista: null,
        dataAtribuicao: null,
        historico: [
          {
            tipo: "registo",
            dataOperacao: new Date().toISOString(),
            justificacao: justificacao.trim(),
            operador: userData?.nome || 'Operador Administrativo',
            detalhes: `Aparelho registado no sistema com número físico ${novoAparelhoNumero.trim()}`
          }
        ]
      };

      await runTransaction(db, async (transaction) => {
        transaction.set(novoDocRef, novoObjeto);
      });

      await addDoc(collection(db, "logs"), {
        acao: "VIA_VERDE_REGISTO",
        detalhes: `Identificador ${proximoIDFormatado} (${novoAparelhoNumero.trim()}) criado no ERP.`,
        justificacao: justificacao.trim(),
        utilizadorNome: userData?.nome || 'Operador',
        utilizadorEmail: userData?.email || '',
        data: new Date().toISOString()
      });

      fecharTodosModais();
    } catch (err) {
      console.error("Erro ao registar aparelho:", err);
      alert("Erro ao efetuar o registo. Por favor, tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * ATRIBUIÇÃO DE APARELHO A MOTORISTA (TIMELINE ATIVA)
   */
  const handleAtribuirAparelho = async (e) => {
    e.preventDefault();
    if (!selectedMotoristaId) {
      alert("Por favor, selecione um motorista.");
      return;
    }
    if (!dataAtribuicao || !horaAtribuicao) {
      alert("Por favor, preencha a data e a hora da atribuição.");
      return;
    }
    if (justificacao.trim().length < 5) {
      alert("A justificação de atribuição deve ter, no mínimo, 5 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const motoristaSelecionado = motoristas.find(m => m.id === selectedMotoristaId);
      const nomeMotorista = motoristaSelecionado?.nome || "Motorista Desconhecido";

      const aparelhoRef = doc(db, "viaverde_aparelhos", selectedAparelho.id);
      
      // Reconstituição em ISOString única para o Firestore
      const dataHoraCombinada = new Date(`${dataAtribuicao}T${horaAtribuicao}`).toISOString();

      const novaMovimentacao = {
        tipo: "atribuicao",
        motoristaId: selectedMotoristaId,
        nomeMotorista: nomeMotorista,
        dataInicio: dataHoraCombinada,
        dataFim: null,
        justificacao: justificacao.trim(),
        operador: userData?.nome || 'Operador Administrativo',
        dataOperacao: new Date().toISOString()
      };

      const historicoAtualizado = [...(selectedAparelho.historio || selectedAparelho.historico || []), novaMovimentacao];

      await updateDoc(aparelhoRef, {
        estado: 'Em Uso',
        motoristaId: selectedMotoristaId,
        nomeMotorista: nomeMotorista,
        dataAtribuicao: dataHoraCombinada,
        historico: historicoAtualizado
      });

      await addDoc(collection(db, "logs"), {
        acao: "VIA_VERDE_ATRIBUICAO",
        detalhes: `Aparelho ${selectedAparelho.id} atribuído ao motorista ${nomeMotorista} a partir de ${formatarDataPT(dataHoraCombinada)}.`,
        justificacao: justificacao.trim(),
        utilizadorNome: userData?.nome || 'Operador',
        utilizadorEmail: userData?.email || '',
        data: new Date().toISOString()
      });

      fecharTodosModais();
    } catch (err) {
      console.error("Erro ao atribuir aparelho:", err);
      alert("Erro ao registar atribuição.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * DEVOLUÇÃO/DESVINCULAÇÃO DE APARELHO (FECHO TEMPORAL)
   */
  const handleDevolverAparelho = async (e) => {
    e.preventDefault();
    if (!dataDevolucao || !horaDevolucao) {
      alert("Por favor, preencha a data e a hora da devolução.");
      return;
    }
    if (justificacao.trim().length < 5) {
      alert("A justificação de devolução deve ter, no mínimo, 5 caracteres.");
      return;
    }

    // Reconstituição e validação cronológica
    const dataInicioAtiva = new Date(selectedAparelho.dataAtribuicao);
    const dataFimProposta = new Date(`${dataDevolucao}T${horaDevolucao}`);

    if (dataFimProposta < dataInicioAtiva) {
      alert(`Erro Cronológico: A data/hora de devolução não pode ser anterior à data/hora de atribuição (${formatarDataPT(selectedAparelho.dataAtribuicao)}).`);
      return;
    }

    setSubmitting(true);
    try {
      const aparelhoRef = doc(db, "viaverde_aparelhos", selectedAparelho.id);
      const dataFimISO = dataFimProposta.toISOString();
      
      const historicoAtualizado = (selectedAparelho.historico || []).map(item => {
        if (item.tipo === "atribuicao" && item.motoristaId === selectedAparelho.motoristaId && item.dataFim === null) {
          return {
            ...item,
            dataFim: dataFimISO,
            justificacaoDevolucao: justificacao.trim(),
            operadorDevolucao: userData?.nome || 'Operador Administrativo'
          };
        }
        return item;
      });

      historicoAtualizado.push({
        tipo: "devolucao",
        motoristaId: selectedAparelho.motoristaId,
        nomeMotorista: selectedAparelho.nomeMotorista,
        dataFim: dataFimISO,
        justificacao: justificacao.trim(),
        operador: userData?.nome || 'Operador Administrativo',
        dataOperacao: new Date().toISOString()
      });

      await updateDoc(aparelhoRef, {
        estado: 'Disponível',
        motoristaId: null,
        nomeMotorista: null,
        dataAtribuicao: null,
        historico: historicoAtualizado
      });

      await addDoc(collection(db, "logs"), {
        acao: "VIA_VERDE_DEVOLUCAO",
        detalhes: `Aparelho ${selectedAparelho.id} devolvido pelo motorista ${selectedAparelho.nomeMotorista} em ${formatarDataPT(dataFimISO)}.`,
        justificacao: justificacao.trim(),
        utilizadorNome: userData?.nome || 'Operador',
        utilizadorEmail: userData?.email || '',
        data: new Date().toISOString()
      });

      fecharTodosModais();
    } catch (err) {
      console.error("Erro ao processar devolução:", err);
      alert("Erro ao registar devolução.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * DESATIVAR/REATIVAR APARELHO FISICAMENTE
   */
  const handleAlternarEstadoAtivo = async (aparelho, novoEstado) => {
    const acaoTexto = novoEstado === 'Inativo' ? 'desativar' : 'reativar';
    const justificacaoPrompt = prompt(`Escreva a justificação obrigatória para ${acaoTexto} o aparelho ${aparelho.id} (mínimo 5 caracteres):`);
    
    if (justificacaoPrompt === null) return;
    if (justificacaoPrompt.trim().length < 5) {
      alert("A operação foi cancelada. A justificação necessita de pelo menos 5 caracteres.");
      return;
    }

    try {
      const aparelhoRef = doc(db, "viaverde_aparelhos", aparelho.id);
      let historicoAtualizado = [...(aparelho.historico || [])];

      if (novoEstado === 'Inativo' && aparelho.estado === 'Em Uso') {
        historicoAtualizado = historicoAtualizado.map(item => {
          if (item.tipo === "atribuicao" && item.motoristaId === aparelho.motoristaId && item.dataFim === null) {
            return {
              ...item,
              dataFim: new Date().toISOString(),
              justificacaoDevolucao: `Desativação forçada do aparelho: ${justificacaoPrompt.trim()}`,
              operadorDevolucao: userData?.nome || 'Operador'
            };
          }
          return item;
        });
      }

      historicoAtualizado.push({
        tipo: novoEstado === 'Inativo' ? "desativacao" : "reativacao",
        dataOperacao: new Date().toISOString(),
        justificacao: justificacaoPrompt.trim(),
        operador: userData?.nome || 'Operador',
        detalhes: `Estado do identificador alterado para ${novoEstado}`
      });

      await updateDoc(aparelhoRef, {
        estado: novoEstado,
        motoristaId: null,
        nomeMotorista: null,
        dataAtribuicao: null,
        historico: historicoAtualizado
      });

      await addDoc(collection(db, "logs"), {
        acao: "VIA_VERDE_ESTADO",
        detalhes: `Aparelho ${aparelho.id} alterado para estado '${novoEstado}'.`,
        justificacao: justificacaoPrompt.trim(),
        utilizadorNome: userData?.nome || 'Operador',
        utilizadorEmail: userData?.email || '',
        data: new Date().toISOString()
      });

      alert(`Aparelho ${aparelho.id} alterado com sucesso.`);
    } catch (err) {
      console.error("Erro ao alterar estado do aparelho:", err);
      alert("Ocorreu um erro ao atualizar o estado.");
    }
  };

  const aparelhosFiltrados = aparelhos.filter(a => {
    const texto = filtroPesquisa.toLowerCase();
    const matchesID = a.id.toLowerCase().includes(texto);
    const matchesNumero = (a.numeroAparelho || '').toLowerCase().includes(texto);
    const matchesMotorista = (a.nomeMotorista || '').toLowerCase().includes(texto);
    return matchesID || matchesNumero || matchesMotorista;
  });

  const kpiTotal = aparelhos.length;
  const kpiEmUso = aparelhos.filter(a => a.estado === 'Em Uso').length;
  const kpiDisponiveis = aparelhos.filter(a => a.estado === 'Disponível').length;
  const kpiInativos = aparelhos.filter(a => a.estado === 'Inativo').length;

  return (
    <div className="space-y-6">
      {headerSlot && createPortal(
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Radio className="text-tvde-primary" size={24} />
              Identificadores Via Verde
            </h1>
            <p className="text-xs text-slate-500 font-medium">Gestão e atribuição temporal de aparelhos a motoristas</p>
          </div>
          <button
            onClick={() => {
              setNovoAparelhoNumero('');
              setJustificacao('');
              setShowFormModal(true);
            }}
            className="bg-tvde-primary hover:bg-blue-600 text-white font-bold py-1.5 px-4 rounded-xl text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            Registar Aparelho
          </button>
        </div>,
        headerSlot
      )}

      {/* MINI-DASHBOARD DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-slate-50 rounded-lg text-slate-500">
            <Radio size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Aparelhos</p>
            <h3 className="text-lg font-black text-slate-800">{loading ? '...' : kpiTotal}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-lg text-tvde-primary">
            <ArrowLeftRight size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Em Uso (Atribuídos)</p>
            <h3 className="text-lg font-black text-blue-600">{loading ? '...' : kpiEmUso}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <Check size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Disponíveis</p>
            <h3 className="text-lg font-black text-emerald-600">{loading ? '...' : kpiDisponiveis}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <X size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inativos</p>
            <h3 className="text-lg font-black text-red-500">{loading ? '...' : kpiInativos}</h3>
          </div>
        </div>
      </div>

      {/* PAINEL DE FILTRAGEM E TABELA */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar ID, aparelho ou motorista..."
              value={filtroPesquisa}
              onChange={(e) => setFiltroPesquisa(e.target.value)}
              className="pl-9 pr-4 py-1.5 w-full bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-tvde-primary/20 focus:border-tvde-primary outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            A mostrar {aparelhosFiltrados.length} de {aparelhos.length} aparelhos
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-tvde-primary" size={16} />
              A ler base de dados da Via Verde...
            </div>
          ) : aparelhosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400 italic">
              Nenhum identificador encontrado com os filtros aplicados.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cód. Interno</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nº Identificador (Físico)</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Estado</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detentor Atual (Motorista)</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Viatura Associada</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atribuído Em</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aparelhosFiltrados.map((aparelho) => {
                  const motoristaVinculado = motoristas.find(m => m.id === aparelho.motoristaId);
                  const matriculaViatura = motoristaVinculado?.matricula || motoristaVinculado?.veiculo || "-";

                  return (
                    <tr key={aparelho.id} className="hover:bg-slate-50/40 transition-colors text-slate-700">
                      <td className="py-3 px-4 font-black text-xs text-slate-800">{aparelho.id}</td>
                      <td className="py-3 px-4 font-mono text-xs font-bold tracking-tight text-slate-600">
                        {aparelho.numeroAparelho}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                          aparelho.estado === 'Em Uso' 
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : aparelho.estado === 'Disponível'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-red-50 text-red-500 border border-red-100'
                        }`}>
                          {aparelho.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {aparelho.estado === 'Em Uso' ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[9px] font-bold">
                              {aparelho.nomeMotorista ? aparelho.nomeMotorista[0] : 'M'}
                            </div>
                            <span className="text-xs font-bold text-slate-800">{aparelho.nomeMotorista}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic font-medium">Livre em stock</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {aparelho.estado === 'Em Uso' && matriculaViatura !== "-" ? (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                            <Car size={10} />
                            {matriculaViatura}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-500">
                        {aparelho.estado === 'Em Uso' ? formatarDataPT(aparelho.dataAtribuicao) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          <button
                            onClick={() => {
                              setSelectedAparelho(aparelho);
                              setShowHistoricoModal(true);
                            }}
                            title="Ver histórico de atribuições"
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-all cursor-pointer"
                          >
                            <FileText size={15} />
                          </button>

                          {aparelho.estado === 'Disponível' && (
                            <button
                              onClick={() => {
                                setSelectedAparelho(aparelho);
                                setDataAtribuicao(obterDataLocal());
                                setHoraAtribuicao(obterHoraLocal());
                                setShowAtribuicaoModal(true);
                              }}
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowLeftRight size={10} />
                              Atribuir
                            </button>
                          )}

                          {aparelho.estado === 'Em Uso' && (
                            <button
                              onClick={() => {
                                setSelectedAparelho(aparelho);
                                setDataDevolucao(obterDataLocal());
                                setHoraDevolucao(obterHoraLocal());
                                setShowDevolucaoModal(true);
                              }}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Check size={10} />
                              Receber
                            </button>
                          )}

                          {aparelho.estado !== 'Inativo' ? (
                            <button
                              onClick={() => handleAlternarEstadoAtivo(aparelho, 'Inativo')}
                              title="Desativar Identificador"
                              className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAlternarEstadoAtivo(aparelho, 'Disponível')}
                              title="Reativar Identificador"
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-all cursor-pointer text-[10px] font-bold"
                            >
                              Ativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: REGISTO DE APARELHO (NOVO)                      */}
      {/* ========================================================= */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Radio className="text-tvde-primary" size={16} />
                Registar Identificador Via Verde
              </h3>
              <button 
                onClick={fecharTodosModais}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-150 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleRegistarAparelho} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Nº Físico do Identificador</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 12345678901 (físico na caixa)"
                  value={novoAparelhoNumero}
                  onChange={(e) => setNovoAparelhoNumero(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-tvde-primary/20 focus:border-tvde-primary outline-none transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Justificação do Registo (Mínimo 5 caract.)
                </label>
                <textarea
                  required
                  placeholder="Ex: Novo lote de aparelhos recebidos para a frota..."
                  value={justificacao}
                  onChange={(e) => setJustificacao(e.target.value)}
                  className="w-full h-20 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-tvde-primary/20 focus:border-tvde-primary outline-none transition-all text-slate-700"
                />
                <div className="flex justify-between items-center mt-1 text-[9px] font-bold">
                  <span className={justificacao.trim().length >= 5 ? "text-emerald-600" : "text-red-500"}>
                    {justificacao.trim().length} / 5 caracteres mínimos
                  </span>
                  {justificacao.trim().length >= 5 && <span className="text-emerald-600">✔ Válida</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={fecharTodosModais}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || justificacao.trim().length < 5 || !novoAparelhoNumero.trim()}
                  className="flex-1 py-2 bg-tvde-primary hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  {submitting ? "A Registar..." : "Salvar Aparelho"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ATRIBUIÇÃO A MOTORISTA (UX MELHORADA)            */}
      {/* ========================================================= */}
      {showAtribuicaoModal && selectedAparelho && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <ArrowLeftRight className="text-emerald-600" size={16} />
                Atribuir Aparelho {selectedAparelho.id}
              </h3>
              <button 
                onClick={fecharTodosModais}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-150 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleAtribuirAparelho} className="p-5 space-y-4">
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-slate-600">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-0.5">Identificador Selecionado</p>
                <p className="text-xs font-black text-emerald-800">{selectedAparelho.numeroAparelho}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Selecionar Motorista</label>
                <select
                  required
                  value={selectedMotoristaId}
                  onChange={(e) => setSelectedMotoristaId(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-tvde-primary/20 focus:border-tvde-primary outline-none transition-all text-slate-700"
                >
                  <option value="">-- Escolha o condutor --</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome} (Viatura: {m.matricula || m.veiculo || 'Nenhuma'})
                    </option>
                  ))}
                </select>
              </div>

              {/* [NOVO]: Campo dividido de data/hora de entrega com atalhos de presets */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Atalhos Rápidos de Horário</label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => aplicarPresetAtribuicao('agora')}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-tvde-primary rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    ⚡ Agora
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarPresetAtribuicao('turnoA')}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    🌅 Turno A (06:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarPresetAtribuicao('turnoB')}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Option B (18:00)
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Data de Início</label>
                    <input
                      type="date"
                      required
                      value={dataAtribuicao}
                      onChange={(e) => setDataAtribuicao(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-tvde-primary/20 focus:border-tvde-primary outline-none transition-all text-slate-700 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Hora de Início</label>
                    <input
                      type="time"
                      required
                      value={horaAtribuicao}
                      onChange={(e) => setHoraAtribuicao(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-tvde-primary/20 focus:border-tvde-primary outline-none transition-all text-slate-700 text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Justificação da Entrega (Mínimo 5 caract.)
                </label>
                <textarea
                  required
                  placeholder="Ex: Entrega do identificador físico para início de turnos em viatura partilhada..."
                  value={justificacao}
                  onChange={(e) => setJustificacao(e.target.value)}
                  className="w-full h-20 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-tvde-primary/20 focus:border-tvde-primary outline-none transition-all text-slate-700"
                />
                <div className="flex justify-between items-center mt-1 text-[9px] font-bold">
                  <span className={justificacao.trim().length >= 5 ? "text-emerald-600" : "text-red-500"}>
                    {justificacao.trim().length} / 5 caracteres mínimos
                  </span>
                  {justificacao.trim().length >= 5 && <span className="text-emerald-600">✔ Válida</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={fecharTodosModais}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || justificacao.trim().length < 5 || !selectedMotoristaId || !dataAtribuicao || !horaAtribuicao}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  {submitting ? "A Gravar..." : "Atribuir Agora"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DEVOLUÇÃO / RECEÇÃO FÍSICA (UX MELHORADA)        */}
      {/* ========================================================= */}
      {showDevolucaoModal && selectedAparelho && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Check className="text-blue-600" size={16} />
                Receber Aparelho {selectedAparelho.id}
              </h3>
              <button 
                onClick={fecharTodosModais}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-150 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleDevolverAparelho} className="p-5 space-y-4">
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-slate-600 space-y-1.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Identificador</p>
                  <p className="text-xs font-black text-blue-900">{selectedAparelho.numeroAparelho}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Detentor (Devolvendo)</p>
                  <p className="text-xs font-black text-blue-900">{selectedAparelho.nomeMotorista}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Entregue em</p>
                  <p className="text-xs font-bold text-slate-850">{formatarDataPT(selectedAparelho.dataAtribuicao)}</p>
                </div>
              </div>

              {/* [NOVO]: Campo dividido de data/hora de fim com atalhos de presets */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Atalhos Rápidos de Horário</label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => aplicarPresetDevolucao('agora')}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-tvde-primary rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    ⚡ Agora
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarPresetDevolucao('turnoA')}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    🌅 Turno A (06:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarPresetDevolucao('turnoB')}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    🌃 Turno B (18:00)
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Data de Devolução</label>
                    <input
                      type="date"
                      required
                      value={dataDevolucao}
                      onChange={(e) => setDataDevolucao(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-tvde-primary/20 focus:border-tvde-primary outline-none transition-all text-slate-700 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Hora de Devolução</label>
                    <input
                      type="time"
                      required
                      value={horaDevolucao}
                      onChange={(e) => setHoraDevolucao(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-tvde-primary/20 focus:border-tvde-primary outline-none transition-all text-slate-700 text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Justificação da Devolução (Mínimo 5 caract.)
                </label>
                <textarea
                  required
                  placeholder="Ex: Devolução por saída de motorista, transponder encontra-se em perfeito estado..."
                  value={justificacao}
                  onChange={(e) => setJustificacao(e.target.value)}
                  className="w-full h-20 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-tvde-primary/20 focus:border-tvde-primary outline-none transition-all text-slate-700"
                />
                <div className="flex justify-between items-center mt-1 text-[9px] font-bold">
                  <span className={justificacao.trim().length >= 5 ? "text-emerald-600" : "text-red-500"}>
                    {justificacao.trim().length} / 5 caracteres mínimos
                  </span>
                  {justificacao.trim().length >= 5 && <span className="text-emerald-600">✔ Válida</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={fecharTodosModais}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || justificacao.trim().length < 5 || !dataDevolucao || !horaDevolucao}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  {submitting ? "A Guardar..." : "Registar Devolução"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: HISTÓRICO DE ATRIBUIÇÕES                         */}
      {/* ========================================================= */}
      {showHistoricoModal && selectedAparelho && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <ShieldAlert className="text-tvde-primary" size={16} />
                Histórico do Identificador {selectedAparelho.id}
              </h3>
              <button 
                onClick={fecharTodosModais}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-150 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 bg-slate-50/50 border-b border-slate-100 shrink-0 text-slate-600 text-xs flex justify-between gap-4">
              <div>
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Nº Identificador Físico</span>
                <span className="font-mono font-bold">{selectedAparelho.numeroAparelho}</span>
              </div>
              <div>
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Estado Atual</span>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight ${
                  selectedAparelho.estado === 'Em Uso' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                }`}>{selectedAparelho.estado}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {!(selectedAparelho.historico) || selectedAparelho.historico.length === 0 ? (
                <p className="text-xs text-slate-400 text-center italic py-8">Nenhum registo de auditoria detetado para este aparelho.</p>
              ) : (
                <div className="relative pl-6 border-l-2 border-slate-150 space-y-5">
                  {selectedAparelho.historico.map((log, index) => {
                    const isAtribuicao = log.tipo === 'atribuicao';
                    const isDevolucao = log.tipo === 'devolucao';
                    const isRegisto = log.tipo === 'registo';

                    return (
                      <div key={index} className="relative">
                        <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                          isAtribuicao ? 'bg-emerald-500' : isDevolucao ? 'bg-blue-500' : 'bg-slate-500'
                        }`} />

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className={`uppercase px-2 py-0.5 rounded text-[8px] font-black ${
                              isAtribuicao 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : isDevolucao 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {log.tipo}
                            </span>
                            <span className="text-slate-400">
                              {formatarDataPT(log.dataOperacao || log.dataInicio || log.dataFim)}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                            {isAtribuicao && `Atribuído ao Motorista: ${log.nomeMotorista}`}
                            {isDevolucao && `Devolvido pelo Motorista: ${log.nomeMotorista}`}
                            {isRegisto && `Registo inicial: ${log.detalhes}`}
                          </p>

                          {isAtribuicao && (
                            <div className="bg-white p-2 rounded-lg border border-slate-100 text-[11px] font-medium text-slate-500 space-y-1">
                              <div>
                                <span className="font-bold text-slate-700 block">Horário de Início de Posse (Verdade Absoluta):</span>
                                <span className="font-mono text-slate-600">{formatarDataPT(log.dataInicio)}</span>
                              </div>
                              {log.dataFim ? (
                                <div className="pt-1.5 border-t border-slate-100">
                                  <span className="font-bold text-slate-700 block">Horário de Fim de Posse (Fecho Temporal):</span>
                                  <span className="font-mono text-emerald-600">{formatarDataPT(log.dataFim)}</span>
                                </div>
                              ) : (
                                <div className="pt-1.5 border-t border-slate-100 text-emerald-600 font-bold animate-pulse">
                                  ● Detentor Ativo neste momento
                                </div>
                              )}
                            </div>
                          )}

                          <div className="pt-1.5 border-t border-slate-100/50 text-slate-500 text-[11px] leading-relaxed">
                            <span className="font-bold text-slate-700">Justificação: </span>
                            {log.justificacao || log.justificacaoDevolucao || 'Nenhuma introduzida'}
                          </div>

                          <div className="text-[9px] font-bold text-slate-400">
                            Operador: {log.operador || log.operadorDevolucao || 'Gestor'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={fecharTodosModais}
                className="py-1.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Fechar Painel de Auditoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}