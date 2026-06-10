/**
 * ModalFinanceiro.jsx
 * Localização: src/features/financeiro/ModalFinanceiro.jsx
 *
 * Modal dedicado à gestão financeira completa de uma entidade com identidade fictícia corporativa.
 */

import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight, Settings2, Shield, RefreshCcw, Loader2, AlertTriangle } from 'lucide-react';
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
  quitarParcelaCaucao, // Função transacional integrada
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

// ─── Definição dos separadores ───────────────────────────────────────────────
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

  // ── Estados de Navegação e Carregamento ───────────────────────────────────
  const [abaAtiva, setAbaAtiva] = useState('conta');
  const [loadingDados, setLoadingDados]         = useState(true);

  // ── Estados dos Dados de Entidade ─────────────────────────────────────────
  const [movimentos, setMovimentos]             = useState([]);
  const [configuracao, setConfiguracao]         = useState(null);
  const [caucaoAtiva, setCaucaoAtiva]           = useState(null);
  const [historicoCaucoes, setHistoricoCaucoes] = useState([]);
  const [renegociacaoAtiva, setRenegociacaoAtiva]           = useState(null);
  const [historicoRenegociacoes, setHistoricoRenegociacoes] = useState([]);

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

  // ── Saldo calculado (créditos - débitos pendentes) ────────────────────────
  const saldo = movimentos.reduce((acc, mov) => {
    return mov.tipoMovimento === 'credito'
      ? acc + Number(mov.valor || 0)
      : acc - Number(mov.valor || 0);
  }, 0);

  // ── Função Central de Carregamento de Dados (Refresh) ─────────────────────
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

  // ── Carregamento reativo quando o modal abre ou muda de contexto ──────────
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

  // ── Funções de Escrita e Mutação Partilhadas ──────────────────────────────

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

  // Handler para Quitação Individual de Parcela de Caução
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
        userData?.nome, 'Plano de Renegociação', 'Financeiro',
        `Renegociação criada para ${nomeEntidade}: ${dados.valorDivida}€ em ${dados.numeroParcelas} semanas`,
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
    await updateDoc(doc(db, 'movimentos_financeiros', movimentoId), {
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

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
                  onQuitarParcela={handleQuitarParcelaIndividual} // Prop repassada corretamente
                />
              )}
              {abaAtiva === 'renegociacao' && (
                <RenegociacaoTab
                  renegociacaoAtiva={renegociacaoAtiva}
                  historico={historicoRenegociacoes}
                  saldoAtual={saldo}
                  nomeEntidade={nomeEntidade}
                  onCriar={handleCriarRenegociacao}
                  onCancelar={handleCancelarRenegociacao}
                />
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}