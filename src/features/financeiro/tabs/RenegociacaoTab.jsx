/**
 * RenegociacaoTab.jsx
 * Localização: src/features/financeiro/tabs/RenegociacaoTab.jsx
 *
 * Separador 4 do ModalFinanceiro.
 * Gere o plano de pagamento faseado de dívida (saldo negativo).
 *
 * Este separador só aparece quando:
 *   - O saldo da entidade é negativo (há dívida)
 *   - OU já existe um plano de renegociação activo
 */

import React, { useState } from 'react';
import {
  RefreshCcw, AlertTriangle, CheckCircle2, AlertCircle,
  Loader2, ChevronDown, ChevronUp, Calculator, XCircle
} from 'lucide-react';

const FORM_INICIAL = {
  valorDivida:    '',
  numeroParcelas: '',
  motivoDivida:   'Saldo negativo acumulado'
};

export default function RenegociacaoTab({
  renegociacaoAtiva,
  historico = [],
  saldoAtual,
  nomeEntidade,
  onCriar,
  onCancelar
}) {
  const [form, setForm]                           = useState(FORM_INICIAL);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarHistorico,  setMostrarHistorico]  = useState(false);
  const [loadingCriar,    setLoadingCriar]        = useState(false);
  const [loadingCancelar, setLoadingCancelar]     = useState(false);
  const [feedback, setFeedback]                   = useState(null);

  const atualizar = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    setFeedback(null);
  };

  // Parcela calculada automaticamente com precisão de duas casas decimais
  const parcelaCalculada = () => {
    const valor    = Number(form.valorDivida    || 0);
    const parcelas = Number(form.numeroParcelas || 0);
    if (!valor || !parcelas || parcelas <= 0) return 0;
    return Number((valor / parcelas).toFixed(2));
  };

  // Progresso do plano activo em percentagem
  const progressoPct = renegociacaoAtiva
    ? Math.min(100, Math.round((renegociacaoAtiva.valorPago / renegociacaoAtiva.valorDivida) * 100))
    : 0;

  const parcelasRestantes = renegociacaoAtiva
    ? Math.ceil(renegociacaoAtiva.valorRestante / renegociacaoAtiva.parcelaSemanal)
    : 0;

  // Criar plano de renegociação
  const handleCriar = async () => {
    const valor    = Number(form.valorDivida    || 0);
    const parcelas = Number(form.numeroParcelas || 0);

    if (!valor || valor <= 0) {
      setFeedback({ tipo: 'erro', texto: 'Por favor, introduza o valor da dívida a renegociar.' });
      return;
    }
    if (!parcelas || parcelas < 1) {
      setFeedback({ tipo: 'erro', texto: 'Defina o número de semanas pretendido para o parcelamento.' });
      return;
    }
    if (parcelas > 52) {
      setFeedback({ tipo: 'erro', texto: 'O limite máximo para parcelamento é de 52 semanas (1 ano).' });
      return;
    }

    setLoadingCriar(true);
    try {
      const resultado = await onCriar({
        valorDivida:    valor,
        numeroParcelas: parcelas,
        motivoDivida:   form.motivoDivida || 'Saldo negativo acumulado'
      });
      setFeedback({ tipo: resultado.sucesso ? 'ok' : 'erro', texto: resultado.msg });
      if (resultado.sucesso) {
        setForm(FORM_INICIAL);
        setMostrarFormulario(false);
      }
    } catch (err) {
      setFeedback({ tipo: 'erro', texto: 'Ocorreu um erro ao submeter o plano à base de dados.' });
    } finally {
      setLoadingCriar(false);
    }
  };

  // Cancelar plano ativo com justificação exigida (padrão de auditoria do ERP)
  const handleCancelar = async () => {
    const motivo = window.prompt(
      'Indique pormenorizadamente o motivo do cancelamento do plano de renegociação (Obrigatório para Auditoria):'
    );
    if (!motivo) return;

    setLoadingCancelar(true);
    try {
      const resultado = await onCancelar(motivo);
      setFeedback({ tipo: resultado.sucesso ? 'ok' : 'erro', texto: resultado.msg });
    } catch (err) {
      setFeedback({ tipo: 'erro', texto: 'Ocorreu um erro ao cancelar o plano ativo.' });
    } finally {
      setLoadingCancelar(false);
    }
  };

  const planosAnteriores = historico.filter(
    r => r.status === 'liquidada' || r.status === 'cancelada'
  );

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Alerta de Saldo Negativo e Ação Rápida de Renegociação ──────────── */}
      {saldoAtual < 0 && !renegociacaoAtiva && (
        <div className="flex items-start gap-4 bg-red-50 border border-red-200 rounded-2xl p-5 shadow-xs">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-700 text-sm">Saldo Devedor Detetado</p>
            <p className="text-xs text-red-500 mt-0.5">
              {nomeEntidade} apresenta um saldo devedor pendente de_ {' '}
              <span className="font-bold">{Number(Math.abs(saldoAtual)).toFixed(2)}€</span>. 
              Pode criar um plano de renegociação para diluir este valor por parcelas semanais recorrentes.
            </p>
          </div>
          <button
            onClick={() => { setMostrarFormulario(true); atualizar('valorDivida', Math.abs(saldoAtual).toFixed(2)); }}
            className="shrink-0 px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-colors shadow-xs"
          >
            Fracionar Dívida
          </button>
        </div>
      )}

      {/* ── Visualização do Plano Ativo ─────────────────────────────────────── */}
      {renegociacaoAtiva && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">

          {/* Cabeçalho do Card */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <RefreshCcw size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-800">Plano de Renegociação Ativo</p>
                <p className="text-xs text-slate-400">
                  {renegociacaoAtiva.numeroParcelas} semanas de plano ·{' '}
                  {renegociacaoAtiva.parcelaSemanal}€/semanais
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wider">
              {progressoPct}% liquidado
            </span>
          </div>

          {/* Progresso de Amortização */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 font-semibold mb-2">
              <span>Pago: {Number(renegociacaoAtiva.valorPago).toFixed(2)}€</span>
              <span>Dívida Consolidada: {Number(renegociacaoAtiva.valorDivida).toFixed(2)}€</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${progressoPct}%` }}
              />
            </div>
          </div>

          {/* Detalhes Financeiros */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-100/50 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                Amortizado
              </p>
              <p className="text-base font-black text-emerald-700">
                {Number(renegociacaoAtiva.valorPago).toFixed(2)}€
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100/50 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                Remanescente
              </p>
              <p className="text-base font-black text-amber-700">
                {Number(renegociacaoAtiva.valorRestante).toFixed(2)}€
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Semanas Restantes
              </p>
              <p className="text-base font-black text-slate-700">
                ~{parcelasRestantes}
              </p>
            </div>
          </div>

          {/* Motivo do Ajuste */}
          {renegociacaoAtiva.motivoDivida && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Motivo e Histórico da Dívida
              </p>
              <p className="text-sm text-slate-600 font-medium">
                {renegociacaoAtiva.motivoDivida}
              </p>
            </div>
          )}

          {/* Metadados de Auditoria */}
          {renegociacaoAtiva.aprovadoPor && (
            <p className="text-xs text-slate-400 text-right">
              Validado por <span className="font-bold">{renegociacaoAtiva.aprovadoPor}</span>
              {renegociacaoAtiva.criadoEm && (
                <> a {new Date(renegociacaoAtiva.criadoEm).toLocaleDateString('pt-PT')}</>
              )}
            </p>
          )}

          {/* Cancelamento do Plano */}
          <button
            onClick={handleCancelar}
            disabled={loadingCancelar}
            className="w-full py-3 border-2 border-red-200 text-red-500 font-bold text-sm rounded-xl hover:bg-red-50 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-xs"
          >
            {loadingCancelar ? (
              <><Loader2 size={15} className="animate-spin" /> A submeter cancelamento...</>
            ) : (
              <><XCircle size={15} /> Cancelar Plano de Pagamento</>
            )}
          </button>
        </div>
      )}

      {/* ── Formulário de Criação de Novo Plano ─────────────────────────────── */}
      {mostrarFormulario && !renegociacaoAtiva && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Configurar Plano de Renegociação
          </p>

          {/* Montante da Dívida */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-600">
              Valor a Fracionar
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
              <input
                type="number" min="0" step="0.01"
                placeholder={Math.abs(saldoAtual) > 0 ? Math.abs(saldoAtual).toFixed(2) : '350.00'}
                value={form.valorDivida}
                onChange={e => atualizar('valorDivida', e.target.value)}
                className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Prazo */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-600">
              Número de Semanas (Prazo)
            </label>
            <input
              type="number" min="1" max="52" step="1" placeholder="7"
              value={form.numeroParcelas}
              onChange={e => atualizar('numeroParcelas', e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Calculation */}
          {parcelaCalculada() > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
              <Calculator size={16} className="text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-700">Prestação Semanal Resultante</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {Number(form.valorDivida).toFixed(2)}€ ÷ {form.numeroParcelas} semanas ={' '}
                  <span className="font-bold text-amber-700">
                    {parcelaCalculada().toFixed(2)}€/semanais
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Justificação */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-600">Motivo ou Notas de Abertura</label>
            <input
              type="text"
              placeholder="Ex: Amortização de saldo devedor acumulado em fecho..."
              value={form.motivoDivida}
              onChange={e => atualizar('motivoDivida', e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Feedback Form */}
          {feedback && (
            <div className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 ${
              feedback.tipo === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {feedback.tipo === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {feedback.texto}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3">
            <button
              onClick={() => { setMostrarFormulario(false); setForm(FORM_INICIAL); setFeedback(null); }}
              className="flex-1 py-3 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCriar}
              disabled={loadingCriar}
              className="flex-1 py-3 bg-slate-950 text-white font-bold text-sm rounded-xl hover:bg-slate-900 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-xs"
            >
              {loadingCriar ? (
                <><Loader2 size={15} className="animate-spin" /> A registar...</>
              ) : (
                <><RefreshCcw size={15} /> Criar Plano</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Vista de Isenção de Dívida */}
      {!renegociacaoAtiva && saldoAtual >= 0 && !mostrarFormulario && (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
          <p className="text-slate-500 font-bold text-sm">Sem passivos de renegociação</p>
          <p className="text-slate-400 text-xs mt-1">
            Esta entidade está em conformidade financeira. Não existem planos pendentes ou passivos ativos para {nomeEntidade}.
          </p>
        </div>
      )}

      {/* Feedback do Plano Ativo */}
      {feedback && renegociacaoAtiva && (
        <div className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 ${
          feedback.tipo === 'ok'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {feedback.tipo === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {feedback.texto}
        </div>
      )}

      {/* ── Histórico ── */}
      {planosAnteriores.length > 0 && (
        <div>
          <button
            onClick={() => setMostrarHistorico(!mostrarHistorico)}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
          >
            {mostrarHistorico ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Histórico ({planosAnteriores.length} planos arquivados)
          </button>

          {mostrarHistorico && (
            <div className="mt-3 space-y-2">
              {planosAnteriores.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  <div className="flex items-center gap-3">
                    {r.status === 'liquidada'
                      ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      : <XCircle      size={16} className="text-red-400 shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-bold text-slate-600">
                        {Number(r.valorDivida).toFixed(2)}€ amortizados em {r.numeroParcelas} semanas
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {r.motivoDivida}
                        {r.liquidadaEm && ` · Concluído a ${new Date(r.liquidadaEm).toLocaleDateString('pt-PT')}`}
                        {r.canceladaEm && ` · Cancelado a ${new Date(r.canceladaEm).toLocaleDateString('pt-PT')}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                    r.status === 'liquidada'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}