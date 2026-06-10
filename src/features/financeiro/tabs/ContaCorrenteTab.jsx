/**
 * ContaCorrenteTab.jsx
 * Localização: src/features/financeiro/tabs/ContaCorrenteTab.jsx
 */

import React, { useState } from 'react';
import {
  Plus, Trash2, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Loader2, ArrowLeftRight,
  FileDown, CalendarRange, Ban
} from 'lucide-react';
import { formatCurrency, formatDatePT } from '../../../utils/formatters';
import { generateStatementPDF } from '../../../utils/pdfGenerator';
import { db } from '../../../firebase'; 
import { suspenderParcelaCaucao, obterDadosExtratoEntidade } from '../../../services/financeiroService';

// Função utilitária para obter a segunda-feira da semana corrente
const obterSegundaFeiraDestaSemana = () => {
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0 (Domingo) a 6 (Sábado)
  const diferenca = hoje.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); // Ajusta se for domingo
  const segunda = new Date(hoje.setDate(diferenca));
  return segunda.toISOString().split('T')[0];
};

const SEGUNDA_FEIRA = obterSegundaFeiraDestaSemana();
const HOJE = new Date().toISOString().split('T')[0];

const MOVIMENTO_INICIAL = {
  tipo:      'debito',
  valor:     '',
  descricao: '',
  data:      HOJE,
  categoria: 'debito_geral'
};

export default function ContaCorrenteTab({
  movimentos = [],
  saldo = 0,
  entidadeId,
  tipoEntidade = 'motorista',
  nomeEntidade,
  nifEntidade = '---',
  ibanEntidade = '---',
  dadosCaucao = null,          
  empresa = {},               
  onLancar,
  onEliminar,
  onAtualizarDados            
}) {
  const [novoMov, setNovoMov]             = useState(MOVIMENTO_INICIAL);
  const [loadingLancar, setLoadingLancar] = useState(false);
  const [loadingPdf, setLoadingPdf]       = useState(false);
  const [loadingSuspender, setLoadingSuspender] = useState(false);
  const [feedbackMsg, setFeedbackMsg]     = useState(null);
  const [eliminandoId, setEliminandoId]   = useState(null);

  // Intervalo padrão inteligente: Segunda-feira desta semana até Hoje
  const [dataInicioExtrato, setDataInicioExtrato] = useState(SEGUNDA_FEIRA);
  const [dataFimExtrato, setDataFimExtrato]       = useState(HOJE);

  const totalCreditos = movimentos
    .filter(m => m.tipoMovimento === 'credito')
    .reduce((acc, m) => acc + Number(m.valor || 0), 0);

  const totalDebitos = movimentos
    .filter(m => m.tipoMovimento === 'debito')
    .reduce((acc, m) => acc + Number(m.valor || 0), 0);

  const handleLancar = async () => {
    if (!novoMov.valor || !novoMov.descricao) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Preencha o valor e a descrição.' });
      return;
    }
    if (Number(novoMov.valor) <= 0) {
      setFeedbackMsg({ tipo: 'erro', texto: 'O valor deve ser superior a zero.' });
      return;
    }

    setLoadingLancar(true);
    setFeedbackMsg(null);
    try {
      await onLancar(novoMov);
      setNovoMov(MOVIMENTO_INICIAL);
      setFeedbackMsg({
        tipo:  'ok',
        texto: `${novoMov.tipo === 'credito' ? 'Crédito' : 'Débito'} de ${Number(novoMov.valor).toFixed(2)}€ lançado com sucesso.`
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Erro ao registar o lançamento. Tente novamente.' });
    } finally {
      setLoadingLancar(false);
    }
  };

  const handleEliminar = async (mov) => {
    if (!window.confirm(`Eliminar "${mov.descricao}" (${mov.valor}€)?`)) return;
    setEliminandoId(mov.id);
    try {
      await onEliminar(mov.id);
    } catch (err) {
      console.error(err);
    } finally {
      setEliminandoId(null);
    }
  };

  const handleSuspenderProximaParcela = async () => {
    if (!dadosCaucao) return;
    const proximaParcela = (dadosCaucao.planeamento || []).find(p => p.status === 'pendente');
    if (!proximaParcela) {
      alert("Não existem parcelas pendentes para suspender neste plano de caução.");
      return;
    }

    if (!window.confirm(`Deseja suspender a cobrança da parcela #${proximaParcela.numeroParcela} (${formatCurrency(proximaParcela.valor)})? O planeamento subsequente será adiado 7 dias.`)) {
      return;
    }

    setLoadingSuspender(true);
    try {
      const res = await suspenderParcelaCaucao(db, dadosCaucao.id, proximaParcela.numeroParcela);
      if (res.sucesso) {
        alert("Parcela de caução suspensa com sucesso. O planeamento foi recalculado.");
        if (onAtualizarDados) onAtualizarDados();
      } else {
        alert(`Erro ao suspender parcela: ${res.msg}`);
      }
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao processar a suspensão da parcela.");
    } finally {
      setLoadingSuspender(false);
    }
  };

  const handleExportarPDFPorPeriodo = async () => {
    if (!dataInicioExtrato || !dataFimExtrato) {
      alert("Por favor, selecione as datas de início e fim para a exportação.");
      return;
    }

    console.log("[ContaCorrenteTab] Botão clicado. A iniciar exportação...");
    setLoadingPdf(true);
    
    try {
      const dadosConsolidados = await obterDadosExtratoEntidade(
        db,
        entidadeId,
        tipoEntidade,
        dataInicioExtrato,
        dataFimExtrato
      );

      console.log("[ContaCorrenteTab] Dados obtidos com sucesso:", dadosConsolidados);

      const entidadeMeta = {
        nome: nomeEntidade,
        nif: nifEntidade,
        iban: ibanEntidade
      };

      const payloadPdf = {
        ...dadosConsolidados,
        valorCaucaoAplicado: dadosConsolidados.parcelaCaucaoAplicavel ? dadosConsolidados.parcelaCaucaoAplicavel.valor : 0
      };

      console.log("[ContaCorrenteTab] A invocar renderizador de jsPDF para folha A4...");
      generateStatementPDF(payloadPdf, empresa, entidadeMeta);
      console.log("[ContaCorrenteTab] Download do documento PDF concluído.");

    } catch (err) {
      console.error("[ContaCorrenteTab] Erro crítico ao processar o PDF:", err);
      alert("Ocorreu um erro de processamento ao gerar o extrato PDF.");
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Cartão de Caução ────────────── */}
      {tipoEntidade === 'motorista' && dadosCaucao && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Ponto de Situação da Caução</p>
            </div>
            <p className="text-sm font-medium text-slate-200">
              Valor Contratado: <span className="font-bold text-white">{formatCurrency(dadosCaucao.valorTotal)}</span> | 
              Pago até à data: <span className="font-bold text-emerald-400">{formatCurrency(dadosCaucao.valorPago)}</span>
            </p>
            <p className="text-xs text-slate-400">
              Falta amortizar: <span className="font-bold text-red-400">{formatCurrency(dadosCaucao.valorRestante)}</span>
            </p>
          </div>
          {dadosCaucao.status === 'ativa' && (
            <button
              onClick={handleSuspenderProximaParcela}
              disabled={loadingSuspender}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40"
            >
              {loadingSuspender ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Ban size={13} />
              )}
              Suspender Próxima Parcela
            </button>
          )}
        </div>
      )}

      {/* ── Resumo de Saldos Pendentes ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp size={14} className="text-emerald-600" />
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
              Total Créditos
            </p>
          </div>
          <p className="text-xl font-black text-emerald-700">
            +{formatCurrency(totalCreditos)}
          </p>
        </div>

        <div className={`rounded-2xl p-4 text-center border shadow-xs ${
          saldo >= 0
            ? 'bg-slate-800 border-slate-800 text-white'
            : 'bg-red-600 border-red-600 text-white'
        }`}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <ArrowLeftRight size={14} className="opacity-70" />
            <p className="text-[10px] font-black opacity-70 uppercase tracking-wider">
              Saldo Pendente
            </p>
          </div>
          <p className="text-xl font-black">
            {saldo >= 0 ? '+' : ''}{formatCurrency(saldo)}
          </p>
        </div>

        <div className="bg-red-50/60 border border-red-100/80 rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingDown size={14} className="text-red-500" />
            <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">
              Total Débitos
            </p>
          </div>
          <p className="text-xl font-black text-red-600">
            -{formatCurrency(totalDebitos)}
          </p>
        </div>
      </div>

      {/* ── Bloco Rápido de Geração de Extrato PDF ──────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <CalendarRange size={16} className="text-slate-500" />
          <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Exportar Extrato Avulso (Período Personalizado)
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 mb-1">Data Início</span>
            <input
              type="date"
              value={dataInicioExtrato}
              onChange={e => setDataInicioExtrato(e.target.value)}
              className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 mb-1">Data Fim</span>
            <input
              type="date"
              value={dataFimExtrato}
              onChange={e => setDataFimExtrato(e.target.value)}
              className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <button
            onClick={handleExportarPDFPorPeriodo}
            disabled={loadingPdf}
            className="mt-5 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40 shadow-xs"
          >
            {loadingPdf ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FileDown size={15} />
            )}
            Gerar Extrato A4 PDF
          </button>
        </div>
      </div>

      {/* ── Lançamento Manual ─────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
          Novo Lançamento Manual
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={novoMov.tipo}
            onChange={e => setNovoMov({ ...novoMov, tipo: e.target.value })}
            className="col-span-1 p-2.5 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="debito">🔴 Débito</option>
            <option value="credito">🟢 Crédito</option>
          </select>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">€</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={novoMov.valor}
              onChange={e => setNovoMov({ ...novoMov, valor: e.target.value })}
              className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <input
            type="date"
            value={novoMov.data}
            onChange={e => setNovoMov({ ...novoMov, data: e.target.value })}
            className="p-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
          />

          <button
            onClick={handleLancar}
            disabled={loadingLancar}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors disabled:opacity-40"
          >
            {loadingLancar ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            Registar Lançamento
          </button>
        </div>

        <input
          type="text"
          placeholder="Descrição pormenorizada do motivo (ex: Danos viatura, lavagem manual)..."
          value={novoMov.descricao}
          onChange={e => setNovoMov({ ...novoMov, descricao: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && handleLancar()}
          className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
        />

        {feedbackMsg && (
          <div className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 ${
            feedbackMsg.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {feedbackMsg.tipo === 'ok' ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertCircle size={15} />
            )}
            {feedbackMsg.texto}
          </div>
        )}
      </div>

      {/* ── Listagem de Movimentos Pendentes ───────────────────────────────── */}
      <div>
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
          Movimentos Pendentes de Fecho ({movimentos.length})
        </p>

        {movimentos.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <ArrowLeftRight size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-medium">
              Sem movimentos pendentes registados.
            </p>
            <p className="text-slate-300 text-xs mt-1">
              Os lançamentos lançados aparecem nesta secção até serem consolidados no fecho.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Tipo</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Valor</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Registador por</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movimentos
                  .slice()
                  .sort((a, b) => new Date(b.dataLancamento) - new Date(a.dataLancamento))
                  .map(mov => (
                    <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-500 font-medium whitespace-nowrap">
                        {formatDatePT(new Date(mov.dataLancamento))}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">
                        {mov.descricao}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          mov.tipoMovimento === 'credito'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {mov.tipoMovimento === 'credito' ? (
                            <TrendingUp size={10} />
                          ) : (
                            <TrendingDown size={10} />
                          )}
                          {mov.tipoMovimento}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-black text-sm ${
                        mov.tipoMovimento === 'credito'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}>
                        {mov.tipoMovimento === 'credito' ? '+' : '-'}
                        {formatCurrency(Number(mov.valor || 0))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {mov.criadoPor || '—'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        {eliminandoId === mov.id ? (
                          <Loader2 size={14} className="animate-spin text-slate-300 mx-auto" />
                        ) : (
                          <button
                            onClick={() => handleEliminar(mov)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar lançamento definitivamente"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}