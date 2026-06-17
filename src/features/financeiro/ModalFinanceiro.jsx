/**
 * ModalFinanceiro.jsx
 * Localização: src/features/financeiro/ModalFinanceiro.jsx
 *
 * Modal dedicado à gestão financeira completa de uma entidade.
 * Atualizado e Corrigido com:
 * - Painel lateral fixo (Lado Direito) para Abastecimento/Carregamento e Portagens [2].
 * - Indicadores visuais de estado (Pendente, Lançado Manual, Lançado por IA ou Relatório) [2].
 * - Resolução de erros de tags JSX, imports em falta (Sliders) e parâmetros partidos em RenegociacaoTab [2].
 */

import React, { useState, useEffect } from 'react';
import { 
  X, ArrowLeftRight, Settings2, Shield, RefreshCcw, Loader2, AlertTriangle,
  Fuel, Zap, Coins, CheckCircle, HelpCircle, Save, Trash2, Sparkles, Sliders // ◄ Sliders importado com sucesso
} from 'lucide-react';
import { db } from '../../firebase'; 
import { useAuth } from '../../context/AuthContext';
import {
  getConfiguracaoFinanceira,
  getCaucaoAtiva,
  getHistoricoCaucoes,
  getRenegociacaoAtiva,
  getHistoricoRenegociacoes,
  salvarConfiguracaoFinanceira,
  criarCaucao,
  liquidarCaucao,
  quitarParcelaCaucao, // Import transacional correto
  criarRenegociacao,
  cancelarRenegociacao
} from '../../services/financeiroService';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { logAcaoGlobal } from '../../utils/logger';

// Separadores
import ContaCorrenteTab from './tabs/ContaCorrenteTab';
import TaxaGestaoTab    from './tabs/TaxaGestaoTab';
import CaucaoTab        from './tabs/CaucaoTab';
import RenegociacaoTab  from './tabs/RenegociacaoTab';

// Definição dos separadores
const ABAS = [
  { id: 'conta',        label: 'Conta Corrente', icon: ArrowLeftRight },
  { id: 'gestao',       label: 'Taxa de Gestão',  icon: Settings2      },
  { id: 'caucao',       label: 'Caução',           icon: Shield         },
  { id: 'renegociacao', label: 'Renegociação',     icon: RefreshCcw     },
];

export default function ModalFinanceiro({
  isOpen,
  onClose,
  entidadeId,
  tipoEntidade,
  nomeEntidade
}) {
  const { userData } = useAuth();

  // Estados de Navegação e Carregamento
  const [abaAtiva, setAbaAtiva] = useState('conta');
  const [loadingDados, setLoadingDados] = useState(true);

  // Estados dos Dados de Entidade
  const [movimentos, setMovimentos] = useState([]);
  const [configuracao, setConfiguracao] = useState(null);
  const [caucaoAtiva, setCaucaoAtiva] = useState(null);
  const [historicoCaucoes, setHistoricoCaucoes] = useState([]);
  const [renegociacaoAtiva, setRenegociacaoAtiva] = useState(null);
  const [historicoRenegociacoes, setHistoricoRenegociacoes] = useState([]);

  // Estados locais para os novos campos dedicados do painel fixo [2]
  const [valorAbast, setValAbast] = useState('');
  const [valorPort, setValPort] = useState('');

  // Metadados dinâmicos resolvidos da entidade (NIF, IBAN) para o PDF
  const [entidadeMeta, setEntidadeMeta] = useState({ nif: '---', iban: '---' });

  // Metadados Fictícios da Empresa Operadora Principal
  const empresaOperador = {
    nome: "Gestão TVDE Portugal, Lda.",
    nif: "500123456",
    iban: "PT50002312345678901234567",
    endereco: "Avenida da Liberdade 100, 1250-145 Lisboa",
    contacto: "geral@gestaotvde.pt - www.gestaotvde.pt"
  };

  // Saldo calculado (créditos - débitos pendentes)
  const saldo = movimentos.reduce((acc, mov) => {
    return mov.tipoMovimento === 'credito'
      ? acc + Number(mov.valor || 0)
      : acc - Number(mov.valor || 0);
  }, 0);

  // Mapeamento das Despesas Semanais Fixas existentes no ciclo [2]
  const movAbastecimento = movimentos.find(m => m.categoria === 'abastecimento');
  const movPortagens = movimentos.find(m => m.categoria === 'portagens');

  // Sincroniza os inputs locais com as alterações em tempo real vindas da DB [2]
  useEffect(() => {
    setValAbast(movAbastecimento ? movAbastecimento.valor.toString() : '');
    setValPort(movPortagens ? movPortagens.valor.toString() : '');
  }, [movimentos, movAbastecimento, movPortagens]);

  // Função Central de Carregamento de Dados (Refresh)
  const carregarDadosFinanceiros = async () => {
    if (!entidadeId) return;
    try {
      let colecaoMeta = 'motoristas';
      if (tipoEntidade === 'veiculo') colecaoMeta = 'veiculos';
      if (tipoEntidade === 'proprietario') colecaoMeta = 'proprietarios';

      const perfilDocRef = doc(db, colecaoMeta, entidadeId);
      const perfilSnap = await getDoc(perfilDocRef);
      if (perfilSnap.exists()) {
        const pDados = perfilSnap.data();
        setEntidadeMeta({
          nif: pDados.nif || pDados.nifContribuinte || '---',
          iban: pDados.iban || pDados.nib || '---'
        });
      }

      const [cfg, cau, histCau, reneg, histReneg] = await Promise.all([
        getConfiguracaoFinanceira(db, entidadeId),
        getCaucaoAtiva(db, entidadeId),
        getHistoricoCaucoes(db, entidadeId),
        getRenegociacaoAtiva(db, entidadeId),
        getHistoricoRenegociacoes(db, entidadeId)
      ]);

      setConfiguracao(cfg);
      setCaucaoAtiva(cau);
      setHistoricoCaucoes(histCau);
      setRenegociacaoAtiva(reneg);
      setHistoricoRenegociacoes(histReneg);
    } catch (err) {
      console.error('[ModalFinanceiro] Erro ao obter dados do Firestore:', err);
    } finally {
      setLoadingDados(false);
    }
  };

  // Carregamento reativo quando o modal abre ou muda de contexto
  useEffect(() => {
    if (!isOpen || !entidadeId) return;

    setAbaAtiva('conta');
    setLoadingDados(true);

    const qMov = query(
      collection(db, 'movimentos_financeiros'),
      where('entidadeId',    '==', entidadeId),
      where('pagoNoFechoId', '==', '')
    );
    
    const unsubscribe = onSnapshot(qMov, (snap) => {
      setMovimentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    carregarDadosFinanceiros();

    return () => unsubscribe();
  }, [isOpen, entidadeId, tipoEntidade]);

  // Lógica transacional para salvar ou atualizar as despesas fixas (Abastecimento / Portagens) [2]
  const handleGravarDespesaFixa = async (categoria, valor, origem = 'manual') => {
    if (!valor || Number(valor) <= 0) return;
    
    try {
      const movExistente = categoria === 'abastecimento' ? movAbastecimento : movPortagens;
      
      if (movExistente) {
        // Atualiza o lançamento existente
        await updateDoc(doc(db, 'movimentos_financeiros', movExistente.id), {
          valor: Number(valor),
          origem,
          atualizadoPor: userData?.nome || 'Sistema',
          dataLancamento: new Date().toISOString().split('T')[0]
        });
      } else {
        // Cria um novo lançamento de débito na conta do motorista [2]
        await addDoc(collection(db, 'movimentos_financeiros'), {
          entidadeId,
          tipoEntidade,
          tipoMovimento: 'debito',
          categoria,
          valor: Number(valor),
          descricao: categoria === 'abastecimento' 
            ? 'Abastecimento / Carregamento de Energia Semanal' 
            : 'Portagens / Portagens Via Verde Semanal',
          origem, // manual | ia | relatorio
          dataLancamento: new Date().toISOString().split('T')[0],
          dataCriacao: new Date().toISOString(),
          criadoPor: userData?.nome || 'Sistema',
          pagoNoFechoId: ''
        });
      }

      await logAcaoGlobal(
        userData?.nome,
        categoria === 'abastecimento' ? 'Lançamento Abastecimento' : 'Lançamento Portagens',
        'Financeiro',
        `Lançou ${categoria} no valor de ${valor}€ (Origem: ${origem}) para ${nomeEntidade}`,
        entidadeId
      );
    } catch (error) {
      console.error('[ModalFinanceiro] Erro ao gravar despesa fixa:', error);
      alert('Erro ao guardar a despesa.');
    }
  };

  // Limpa/Cancela o lançamento de despesa fixa [2]
  const handleLimparDespesaFixa = async (categoria) => {
    const movExistente = categoria === 'abastecimento' ? movAbastecimento : movPortagens;
    if (!movExistente) return;

    try {
      await updateDoc(doc(db, 'movimentos_financeiros', movExistente.id), {
        pagoNoFechoId: 'CANCELADO'
      });

      await logAcaoGlobal(
        userData?.nome,
        'Limpeza Despesa',
        'Financeiro',
        `Limpou registo de despesa de ${categoria} de ${nomeEntidade}`,
        entidadeId
      );
    } catch (error) {
      console.error('[ModalFinanceiro] Erro ao limpar despesa fixa:', error);
    }
  };

  const handleSalvarConfiguracao = async (dados) => {
    const resultado = await salvarConfiguracaoFinanceira(
      db, entidadeId, tipoEntidade, dados
    );
    if (resultado.sucesso) {
      await carregarDadosFinanceiros();
      await logAcaoGlobal(
        userData?.nome, 'Configuração Financeira', 'Financeiro',
        `Taxa de gestão actualizada para ${nomeEntidade}`, entidadeId
      );
    }
    return resultado;
  };

  const handleCriarCaucao = async (dados) => {
    const resultado = await criarCaucao(
      db, entidadeId, tipoEntidade, dados, userData?.nome
    );
    if (resultado.sucesso) {
      await carregarDadosFinanceiros();
      await logAcaoGlobal(
        userData?.nome, 'Criação de Caução', 'Financeiro',
        `Caução criada para ${nomeEntidade}`, entidadeId
      );
    }
    return resultado;
  };

  const handleLiquidarCaucao = async () => {
    if (!caucaoAtiva) return;
    const resultado = await liquidarCaucao(db, caucaoAtiva.id);
    if (resultado.sucesso) {
      await carregarDadosFinanceiros();
      await logAcaoGlobal(
        userData?.nome, 'Liquidação de Caução', 'Financeiro',
        `Caução liquidada para ${nomeEntidade}`, entidadeId
      );
    }
    return resultado;
  };

  // ◄ CORRIGIDO: Nome da função unificado e chamada transacional sem erros de grafia
  const handleQuitarParcelaIndividual = async (numParcela) => {
    if (!caucaoAtiva) return { sucesso: false, msg: "Plano de caução não ativo." };
    const resultado = await quitarParcelaCaucao(db, caucaoAtiva.id, numParcela, userData?.nome || 'Sistema');
    if (resultado.sucesso) {
      await carregarDadosFinanceiros();
      await logAcaoGlobal(
        userData?.nome, 'Quitação de Parcela', 'Financeiro',
        `Parcela #${numParcela} de caução amortizada para ${nomeEntidade}`, entidadeId
      );
    }
    return resultado;
  };

  const handleCriarRenegociacao = async (dados) => {
    const resultado = await criarRenegociacao(
      db, entidadeId, tipoEntidade, dados, userData?.nome
    );
    if (resultado.sucesso) {
      await carregarDadosFinanceiros();
      await logAcaoGlobal(
        userData?.nome, 'Criação de Renegociação', 'Financeiro',
        `Criou plano de renegociação para ${nomeEntidade}`,
        entidadeId
      );
    }
    return resultado;
  };

  const handleCancelarRenegociacao = async (motivo) => {
    if (!renegociacaoAtiva) return;
    const resultado = await cancelarRenegociacao(db, renegociacaoAtiva.id, motivo);
    if (resultado.sucesso) {
      await carregarDadosFinanceiros();
      await logAcaoGlobal(
        userData?.nome, 'Cancelamento de Renegociação', 'Financeiro',
        `Plano cancelado para ${nomeEntidade}`, entidadeId
      );
    }
    return resultado;
  };

  const handleLancarMovimento = async (movimento) => {
    await addDoc(collection(db, 'movimentos_financeiros'), {
      entidadeId,
      tipoEntidade,
      tipoMovimento:  movimento.tipo,
      categoria:      movimento.categoria || 'debito_geral',
      valor:          Number(movimento.valor),
      descricao:      movimento.descricao,
      dataLancamento: movimento.data || new Date().toISOString().split('T')[0],
      dataCriacao:    new Date().toISOString(),
      criadoPor:      userData?.nome || 'Sistema',
      pagoNoFechoId:  ''
    });
    
    await logAcaoGlobal(
      userData?.nome,
      movimento.tipo === 'credito' ? 'Crédito Manual' : 'Débito Manual',
      'Financeiro',
      `${movimento.descricao} (${movimento.valor}€) — ${nomeEntidade}`,
      entidadeId
    );
  };

  const handleEliminarMovimento = async (movimentoId) => {
    await updateDoc(doc(db, 'movimentos_financeiros', movimientoId), {
      pagoNoFechoId: 'CANCELADO'
    });
    
    await logAcaoGlobal(
      userData?.nome,
      'Eliminação de Lançamento',
      'Financeiro',
      `Cancelado movimento ID: ${movimentoId} para ${nomeEntidade}`,
      entidadeId
    );
  };

  if (!isOpen) return null;

  const mostrarRenegociacao = saldo < 0 || !!renegociacaoAtiva;
  const abasFiltradas = ABAS.filter(
    aba => aba.id !== 'renegociacao' || mostrarRenegociacao
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">
              Gestão Financeira Consolidada
            </p>
            <h3 className="text-xl font-black text-slate-800">{nomeEntidade}</h3>
          </div>
          <div className="flex items-center gap-4">
            {!loadingDados && (
              <div className={`px-4 py-2 rounded-2xl text-sm font-black ${
                saldo >= 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                Saldo: {saldo >= 0 ? '+' : ''}{saldo.toFixed(2)} €
                {saldo < 0 && (
                  <AlertTriangle size={14} className="inline ml-1.5 mb-0.5" />
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all shadow-sm border border-transparent hover:border-slate-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Layout de Corpo Dividido (Abas à esquerda, Painel Fixo à direita) [2] */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Lado Esquerdo: Abas de Configuração e Histórico */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Navegação entre Separadores */}
            <div className="flex gap-1 px-8 pt-4 shrink-0 border-b border-slate-100 bg-white">
              {abasFiltradas.map(aba => {
                const Icone  = aba.icon;
                const ativa  = abaAtiva === aba.id;
                const vermelho = aba.id === 'renegociacao' && saldo < 0;

                return (
                  <button
                    key={aba.id}
                    onClick={() => setAbaAtiva(aba.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 ${
                      ativa
                        ? vermelho
                          ? 'border-red-500 text-red-600 bg-red-50/50'
                          : 'border-slate-800 text-slate-800 bg-slate-50'
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icone size={14} />
                    {aba.label}
                    {aba.id === 'renegociacao' && saldo < 0 && !renegociacaoAtiva && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                    {aba.id === 'renegociacao' && renegociacaoAtiva && (
                      <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                        Ativo
                      </span>
                    )}
                    {aba.id === 'caucao' && caucaoAtiva && (
                      <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                        Ativa
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Corpo do Separador Ativo */}
            <div className="flex-1 overflow-y-auto p-8">
              {loadingDados ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="animate-spin mb-3" size={32} />
                  <p className="text-sm font-medium">A sincronizar dados financeiros...</p>
                </div>
              ) : (
                <>
                  {abaAtiva === 'conta' && (
                    <ContaCorrenteTab
                      movimentos={movimentos}
                      saldo={saldo}
                      entidadeId={entidadeId}
                      tipoEntidade={tipoEntidade}
                      nomeEntidade={nomeEntidade}
                      nifEntidade={entidadeMeta.nif}
                      ibanEntidade={entidadeMeta.iban}
                      dadosCaucao={caucaoAtiva}
                      empresa={empresaOperador}
                      onLancar={handleLancarMovimento}
                      onEliminar={handleEliminarMovimento}
                      onAtualizarDados={carregarDadosFinanceiros}
                    />
                  )}
                  {abaAtiva === 'gestao' && (
                    <TaxaGestaoTab
                      configuracao={configuracao}
                      entidadeId={entidadeId}
                      nomeEntidade={nomeEntidade}
                      onSalvar={handleSalvarConfiguracao}
                    />
                  )}
                  {abaAtiva === 'caucao' && (
                    <CaucaoTab
                      caucaoAtiva={caucaoAtiva}
                      historico={historicoCaucoes}
                      nomeEntidade={nomeEntidade}
                      onCriar={handleCriarCaucao}
                      onLiquidar={handleLiquidarCaucao}
                      onQuitarParcela={handleQuitarParcelaIndividual} // Prop repassada sem typos
                    />
                  )}
                  {abaAtiva === 'renegociacao' && (
                    <RenegociacaoTab
                      renegociacaoAtiva={renegociacaoAtiva} // ◄ CORRIGIDO: Passagem do estado local correto
                      historico={historicoRenegociacoes}    // ◄ CORRIGIDO: Passagem do histórico reconstruída
                      saldoAtual={saldo}                    // ◄ CORRIGIDO: Adicionado parâmetro de saldo
                      nomeEntidade={nomeEntidade}           // ◄ CORRIGIDO: Adicionado parâmetro de nome
                      onCriar={handleCriarRenegociacao}
                      onCancelar={handleCancelarRenegociacao}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Lado Direito: Painel Fixo de Despesas Semanais (Abastecimento e Portagens) [2] */}
          {tipoEntidade === 'motorista' && (
            <div className="w-full md:w-80 bg-slate-50/50 p-6 overflow-y-auto flex flex-col gap-6 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 text-left">
              <div className="border-b border-slate-200/60 pb-3">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders className="text-tvde-primary shrink-0" size={16} />
                  Despesas Semanais Fixas
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Lançamento de despesas de via verde e combustível faturados para acerto no fecho semanal.
                </p>
              </div>

              {/* 1. ABASTECIMENTO / CARREGAMENTO */}
              <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs relative">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Fuel size={12} className="text-blue-500" /> Combustível / Energia
                  </span>
                  
                  {/* Badge de Estado e Origem Visual [2] */}
                  {movAbastecimento ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-100">
                      {movAbastecimento.origem === 'ia' && <Sparkles size={8} className="animate-pulse text-violet-500" />}
                      Lançado ({movAbastecimento.origem || 'Manual'})
                    </span>
                  ) : (
                    <span className="bg-slate-150 text-slate-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
                      Pendente
                    </span>
                  )}
                </div>

                <div className="flex gap-2 items-center pt-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">€</span>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={valorAbast}
                      onChange={(e) => setValAbast(e.target.value)}
                      className="w-full pl-6 pr-2.5 py-2 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  
                  <button
                    onClick={() => handleGravarDespesaFixa('abastecimento', valorAbast, 'manual')}
                    className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all cursor-pointer"
                    title="Gravar Abastecimento"
                  >
                    <Save size={14} />
                  </button>
                  
                  {movAbastecimento && (
                    <button
                      onClick={() => handleLimparDespesaFixa('abastecimento')}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all cursor-pointer"
                      title="Apagar despesa"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. PORTAGENS / VIA VERDE */}
              <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Coins size={12} className="text-purple-500" /> Portagens / Via Verde
                  </span> {/* ◄ CORRIGIDO: Fecho de tag correto (span em vez de p) */}
                  
                  {/* Badge de Estado */}
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${
                    movimentosDisponiveis(movPortagens)
                      ? 'bg-purple-50 text-purple-700 border border-purple-100'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {movPortagens ? `Lançado (${movPortagens.origem || 'Manual'})` : 'Pendente'}
                  </span>
                </div>

                <div className="flex gap-2 items-center pt-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">€</span>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={valorPort}
                      onChange={(e) => setValPort(e.target.value)}
                      className="w-full pl-6 pr-2.5 py-2 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  
                  <button
                    onClick={() => handleGravarDespesaFixa('portagens', valorPort, 'manual')}
                    className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all cursor-pointer"
                    title="Gravar Portagens"
                  >
                    <Save size={14} />
                  </button>
                  
                  {movPortagens && (
                    <button
                      onClick={() => handleLimparDespesaFixa('portagens')}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all cursor-pointer"
                      title="Apagar despesa"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-100/60 p-4 rounded-2xl border border-dashed border-slate-200 text-[10px] text-slate-400 leading-relaxed">
                * Os lançamentos aqui efetuados são de dedução automática no próximo extrato e fecho semanal deste motorista [2].
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

// Pequeno helper de visualização para evitar crashes se portagem for nula
function movimentosDisponiveis(mov) {
  return mov && mov.valor > 0;
}