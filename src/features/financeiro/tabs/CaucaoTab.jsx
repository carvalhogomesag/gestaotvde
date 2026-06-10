/**
 * CaucaoTab.jsx
 * Localização: src/features/financeiro/tabs/CaucaoTab.jsx
 *
 * Separador 3 do ModalFinanceiro.
 * Gere o depósito de segurança (caução) de uma entidade.
 *
 * Dois modos de pagamento:
 *   "pronto"          — pago integralmente de uma vez
 *   "entrada_semanal" — entrada inicial + parcelas debitadas em cada fecho semanal
 */

import React, { useState, useMemo } from 'react';
import {
  Shield, CheckCircle2, AlertCircle, Loader2,
  Plus, CreditCard, Clock, ChevronDown, ChevronUp,
  CalendarDays, Calendar
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';

const FORM_INICIAL = {
  valorTotal:       '',
  tipoPagamento:    'pronto',
  valorEntrada:     '',
  parcelaSemanal:   '',
  dataEntrada:      new Date().toISOString().split('T')[0],
  dataPrimeiraParcela: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  })()
};

/** Gera o calendário de parcelas semanais a partir de uma data inicial */
function gerarCalendarioParcelas(dataPrimeira, valorParcela, valorRestante) {
  if (!dataPrimeira || !valorParcela || valorParcela <= 0 || valorRestante <= 0) return [];
  const parcelas = [];
  let restante   = Number(valorRestante.toFixed(2));
  let data       = new Date(dataPrimeira + 'T00:00:00');
  let i          = 1;
  
  while (restante > 0 && i <= 104) { // Limite de 2 anos de segurança
    const valor = Math.min(valorParcela, restante);
    parcelas.push({
      numero: i,
      data:   data.toISOString().split('T')[0],
      valor:  Number(valor.toFixed(2)),
      ultima: restante <= valorParcela
    });
    restante = Number((restante - valor).toFixed(2));
    data = new Date(data);
    data.setDate(data.getDate() + 7);
    i++;
  }
  return parcelas;
}

/** Formata data PT */
const fmtData = (iso) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export default function CaucaoTab({
  caucaoAtiva,
  historico = [],
  nomeEntidade,
  onCriar,
  onLiquidar,
  onQuitarParcela // Função de quitação parcial repassada do parent
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarHistorico,  setMostrarHistorico]  = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(true);
  const [form, setForm]                           = useState(FORM_INICIAL);
  const [loadingCriar,    setLoadingCriar]        = useState(false);
  const [loadingLiquidar, setLoadingLiquidar]     = useState(false);
  const [loadingParcelaId, setLoadingParcelaId]   = useState(null); // Rastreia qual parcela está a ser quitada
  const [feedback, setFeedback]                   = useState(null);

  const atualizar = (campo, valor) => {
    setForm(prev => {
      const next = { ...prev, [campo]: valor };
      // Ao alterar a data de entrada, ajusta automaticamente a data estimada da primeira prestação (+7 dias)
      if (campo === 'dataEntrada' && valor) {
        const d = new Date(valor + 'T00:00:00');
        d.setDate(d.getDate() + 7);
        next.dataPrimeiraParcela = d.toISOString().split('T')[0];
      }
      return next;
    });
    setFeedback(null);
  };

  // Parcela sugerida remanescente
  const parcelaCalculada = () => {
    const total    = Number(form.valorTotal   || 0);
    const entrada  = Number(form.valorEntrada || 0);
    const restante = total - entrada;
    return restante > 0 ? restante : 0;
  };

  // Valor em aberto pendente de parcelamento para visualização prévia
  const valorRestanteForm = useMemo(() => {
    const total   = Number(form.valorTotal   || 0);
    const entrada = Number(form.valorEntrada || 0);
    return Math.max(0, Number((total - entrada).toFixed(2)));
  }, [form.valorTotal, form.valorEntrada]);

  const parcelaFormNum = useMemo(() =>
    Number(form.parcelaSemanal || parcelaCalculada() || 0),
    [form.parcelaSemanal, form.valorTotal, form.valorEntrada]
  );

  // Calendário simulado para visualização no formulário de criação
  const calendarioPreview = useMemo(() => {
    if (form.tipoPagamento !== 'entrada_semanal') return [];
    if (!form.dataPrimeiraParcela || parcelaFormNum <= 0 || valorRestanteForm <= 0) return [];
    return gerarCalendarioParcelas(form.dataPrimeiraParcela, parcelaFormNum, valorRestanteForm);
  }, [form.tipoPagamento, form.dataPrimeiraParcela, parcelaFormNum, valorRestanteForm]);

  // Calendário do plano ativo na conta corrente
  const calendarioAtivo = useMemo(() => {
    if (!caucaoAtiva || caucaoAtiva.tipoPagamento !== 'entrada_semanal') return [];
    if (!caucaoAtiva.dataPrimeiraParcela || !caucaoAtiva.parcelaSemanal || !caucaoAtiva.valorRestante) return [];
    return gerarCalendarioParcelas(
      caucaoAtiva.dataPrimeiraParcela,
      caucaoAtiva.parcelaSemanal,
      caucaoAtiva.valorRestante
    );
  }, [caucaoAtiva]);

  // Percentagem concluída do plano de depósito
  const progressoPct = caucaoAtiva
    ? Math.min(100, Math.round((caucaoAtiva.valorPago / caucaoAtiva.valorTotal) * 100))
    : 0;

  // Criar caução e lançar movimentos iniciais
  const handleCriar = async () => {
    const total   = Number(form.valorTotal || 0);
    const entrada = Number(form.valorEntrada || 0);
    const parcela = Number(form.parcelaSemanal || parcelaCalculada());

    if (!total || total <= 0) {
      setFeedback({ tipo: 'erro', texto: 'Por favor, introduza o valor total do depósito de caução.' });
      return;
    }
    if (form.tipoPagamento === 'entrada_semanal') {
      if (entrada < 0 || entrada > total) {
        setFeedback({ tipo: 'erro', texto: 'O montante de entrada inicial não pode exceder o valor total estipulado.' });
        return;
      }
      if (parcela <= 0) {
        setFeedback({ tipo: 'erro', texto: 'Defina o valor da prestação semanal a cobrar.' });
        return;
      }
      if (!form.dataEntrada) {
        setFeedback({ tipo: 'erro', texto: 'Indique a data de vencimento da entrada.' });
        return;
      }
      if (!form.dataPrimeiraParcela) {
        setFeedback({ tipo: 'erro', texto: 'Indique a data prevista para a primeira cobrança semanal.' });
        return;
      }
    }

    setLoadingCriar(true);
    try {
      const resultado = await onCriar({
        valorTotal:          total,
        tipoPagamento:       form.tipoPagamento,
        valorEntrada:        form.tipoPagamento === 'pronto' ? total : entrada,
        parcelaSemanal:      form.tipoPagamento === 'pronto' ? 0 : parcela,
        dataEntrada:         form.dataEntrada,
        dataPrimeiraParcela: form.tipoPagamento === 'pronto' ? null : form.dataPrimeiraParcela,
        calendarioParcelas:  form.tipoPagamento === 'pronto' ? [] : calendarioPreview
      });
      
      setFeedback({ tipo: resultado.sucesso ? 'ok' : 'erro', texto: resultado.msg });
      
      if (resultado.sucesso) {
        setForm(FORM_INICIAL);
        setMostrarFormulario(false);
      }
    } catch (err) {
      setFeedback({ tipo: 'erro', texto: 'Erro ao registar caução na base de dados.' });
    } finally {
      setLoadingCriar(false);
    }
  };

  // Liquidação antecipada/quitação
  const handleLiquidar = async () => {
    if (!window.confirm(
      `Confirma a liquidação integral antecipada da caução de ${caucaoAtiva?.valorTotal}€?\n` +
      `O valor pendente em aberto de (${caucaoAtiva?.valorRestante}€) será registado como crédito.`
    )) return;

    setLoadingLiquidar(true);
    try {
      const resultado = await onLiquidar();
      setFeedback({ tipo: resultado.sucesso ? 'ok' : 'erro', texto: resultado.msg });
    } catch (err) {
      setFeedback({ tipo: 'erro', texto: 'Ocorreu um erro ao liquidar o plano.' });
    } finally {
      setLoadingLiquidar(false);
    }
  };

  // Método de Quitação Avulsa de Parcela do Cronograma
  const handleQuitarParcelaIndividual = async (numParcela) => {
    if (!window.confirm(`Deseja quitar individualmente e antecipadamente a Parcela #${numParcela}?`)) return;
    setLoadingParcelaId(numParcela);
    try {
      const res = await onQuitarParcela(numParcela);
      if (res.sucesso) {
        setFeedback({ tipo: 'ok', texto: res.msg });
      } else {
        setFeedback({ tipo: 'erro', texto: res.msg });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ tipo: 'erro', texto: 'Erro ao quitar parcela individual.' });
    } finally {
      setLoadingParcelaId(null);
    }
  };

  const caucaoLiquidadas = historico.filter(c => c.status === 'liquidada');
  const hoje = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Visualização da Caução Ativa ────────────────────────────────────── */}
      {caucaoAtiva ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">

          {/* Cabeçalho do Card */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-800">Caução Ativa</p>
                <p className="text-xs text-slate-400">
                  {caucaoAtiva.tipoPagamento === 'pronto'
                    ? 'Quitação a pronto'
                    : `Entrada inicial + ${caucaoAtiva.parcelaSemanal}€/semanais`
                  }
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              progressoPct >= 100
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-indigo-100 text-indigo-700'
            }`}>
              {progressoPct}% amortizado
            </span>
          </div>

          {/* Barra de Progresso Real */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 font-semibold mb-2">
              <span>Amortizado (Crédito): {Number(caucaoAtiva.valorPago).toFixed(2)}€</span>
              <span>Total Contratual: {Number(caucaoAtiva.valorTotal).toFixed(2)}€</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${progressoPct}%` }}
              />
            </div>
          </div>

          {/* Valores Consolidados */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Total Amortizado (Garantia)
              </p>
              <p className="text-lg font-black text-emerald-600">
                {Number(caucaoAtiva.valorPago).toFixed(2)}€
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100/50 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                Restante em Aberto
              </p>
              <p className="text-lg font-black text-amber-700">
                {Number(caucaoAtiva.valorRestante).toFixed(2)}€
              </p>
            </div>
          </div>

          {/* ── Subextrato de Garantia (Histórico & Previsões) [NOVO] ────────── */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Subextrato de Garantia (Histórico & Previsões)
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {/* 1. Lançamento da Entrada Inicial */}
              {Number(caucaoAtiva.valorEntrada || 0) > 0 && (
                <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200/40">
                  <div>
                    <span className="font-bold text-slate-700">{fmtData(caucaoAtiva.dataEntrada)}</span>
                    <span className="text-slate-500 ml-2">Depósito de Entrada Inicial</span>
                  </div>
                  <span className="font-black text-emerald-600">+{formatCurrency(caucaoAtiva.valorEntrada)}</span>
                </div>
              )}

              {/* 2. Parcelas do planeamento já liquidadas */}
              {(caucaoAtiva.planeamento || [])
                .filter(p => p.status === 'pago')
                .map(p => (
                  <div key={p.numeroParcela} className="flex justify-between items-center text-xs py-1 border-b border-slate-200/40">
                    <div>
                      <span className="font-bold text-slate-700">{fmtData(p.dataPrevista)}</span>
                      <span className="text-slate-500 ml-2">Amortização Parcela #{p.numeroParcela}</span>
                    </div>
                    <span className="font-black text-emerald-600">+{formatCurrency(p.valor)}</span>
                  </div>
                ))}

              {/* 3. Próximas previsões futuras pendentes */}
              {(caucaoAtiva.planeamento || [])
                .filter(p => p.status === 'pendente')
                .slice(0, 3) // Exibir apenas as próximas 3 previsões para manter compacto
                .map(p => (
                  <div key={p.numeroParcela} className="flex justify-between items-center text-xs py-1 border-b border-slate-200/40 opacity-60">
                    <div>
                      <span className="font-bold text-slate-400">{fmtData(p.dataPrevista)}</span>
                      <span className="text-indigo-600 font-medium ml-2">Previsão: Parcela #{p.numeroParcela}</span>
                    </div>
                    <span className="font-bold text-slate-400">-{formatCurrency(p.valor)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Datas para Pagamento Pronto */}
          {caucaoAtiva.tipoPagamento === 'pronto' && caucaoAtiva.dataEntrada && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
              <CalendarDays size={14} className="text-slate-400 shrink-0" />
              <p className="text-xs text-slate-500">
                Lançamento único registado a <span className="font-bold text-slate-700">{fmtData(caucaoAtiva.dataEntrada)}</span>
              </p>
            </div>
          )}

          {/* Planeamento e Calendário para Pagamento Recorrente */}
          {caucaoAtiva.tipoPagamento === 'entrada_semanal' && caucaoAtiva.valorRestante > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {caucaoAtiva.dataEntrada && (
                  <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <CalendarDays size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entrada Registada (Crédito)</p>
                      <p className="text-sm font-bold text-slate-700">{fmtData(caucaoAtiva.dataEntrada)}</p>
                      <p className="text-[10px] text-slate-400">{Number(caucaoAtiva.valorEntrada || 0).toFixed(2)}€</p>
                    </div>
                  </div>
                )}
                {caucaoAtiva.dataPrimeiraParcela && (
                  <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                    <Calendar size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">1ª Prestação</p>
                      <p className="text-sm font-bold text-indigo-600">{fmtData(caucaoAtiva.dataPrimeiraParcela)}</p>
                      <p className="text-[10px] text-indigo-400">{Number(caucaoAtiva.parcelaSemanal).toFixed(2)}€/semana</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabela do Planeamento Estimativo com Botões de Amortização Individual */}
              {calendarioAtivo.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setMostrarCalendario(!mostrarCalendario)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider mb-2"
                  >
                    <CalendarDays size={13} />
                    Modificar Planeamento de Parcelas ({calendarioAtivo.length} pendentes)
                    {mostrarCalendario ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {mostrarCalendario && (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-3 py-2 font-bold text-slate-400 uppercase tracking-wider">Alt</th>
                            <th className="px-3 py-2 font-bold text-slate-400 uppercase tracking-wider">Data Programada</th>
                            <th className="px-3 py-2 font-bold text-slate-400 uppercase tracking-wider text-right">Montante</th>
                            <th className="px-3 py-2 font-bold text-slate-400 uppercase tracking-wider text-center">Estado</th>
                            <th className="px-3 py-2 font-bold text-slate-400 uppercase tracking-wider text-center w-20">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {calendarioAtivo.map((p) => {
                            const statusRealNoFirestore = (caucaoAtiva.planeamento || []).find(f => f.numeroParcela === p.numero)?.status;
                            const estaPaga = statusRealNoFirestore === 'pago';
                            
                            const passada  = p.data < hoje && !estaPaga;
                            const proxima  = !estaPaga && !passada && p.numero === calendarioAtivo.find(x => x.data >= hoje)?.numero;
                            
                            return (
                              <tr key={p.numero} className={proxima ? 'bg-indigo-50/40' : ''}>
                                <td className="px-3 py-2 font-bold text-slate-400">{p.numero}ª</td>
                                <td className="px-3 py-2 font-bold text-slate-700">
                                  {fmtData(p.data)}
                                  {proxima && (
                                    <span className="ml-2 text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase">
                                      Próxima
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-slate-700">
                                  {p.valor.toFixed(2)}€
                                  {p.ultima && (
                                    <span className="ml-1 text-[9px] text-slate-400">(final)</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {estaPaga ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                                      <CheckCircle2 size={9} /> Amortizada
                                    </span>
                                  ) : passada ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-red-100 text-red-500 px-2 py-0.5 rounded-full uppercase">
                                      Atrasada
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full uppercase">
                                      Agendada
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  {!estaPaga && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuitarParcelaIndividual(p.numero)}
                                      disabled={loadingParcelaId !== null}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all disabled:opacity-40"
                                    >
                                      {loadingParcelaId === p.numero ? (
                                        <Loader2 size={10} className="animate-spin mx-auto" />
                                      ) : (
                                        "Quitar"
                                      )}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Botão de Quitação Antecipada na Totalidade */}
          {caucaoAtiva.valorRestante > 0 && (
            <button
              onClick={handleLiquidar}
              disabled={loadingLiquidar}
              className="w-full py-3 border-2 border-emerald-500 text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-sm shadow-xs"
            >
              {loadingLiquidar ? (
                <><Loader2 size={15} className="animate-spin" /> A processar fecho...</>
              ) : (
                <><CheckCircle2 size={15} /> Liquidar Plano na Totalidade</>
              )}
            </button>
          )}
        </div>

      ) : (
        /* Estado Vazio - Sem Caução Registada */
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield size={24} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold text-sm">Sem depósito de segurança ativo</p>
          <p className="text-slate-400 text-xs mt-1 mb-4">
            Abra uma ficha de caução para gerir garantias de frota para {nomeEntidade}.
          </p>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus size={15} /> Configurar Nova Caução
          </button>
        </div>
      )}

      {/* ── Formulário para Criação de Caução ────────────────────────────────── */}
      {mostrarFormulario && !caucaoAtiva && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Nova Ficha de Caução
          </p>

          {/* Valor de Face */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-600">Valor Total da Garantia</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
              <input
                type="number" min="0" step="0.01" placeholder="500.00"
                value={form.valorTotal}
                onChange={e => atualizar('valorTotal', e.target.value)}
                className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Forma de Liquidação */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-600">Regime de Cobrança</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'pronto',          label: 'A Pronto',          desc: 'Quitação num único ato',      icon: CreditCard },
                { id: 'entrada_semanal', label: 'Entrada + Parcelas', desc: 'Fracionamento no fecho',       icon: Clock }
              ].map(op => {
                const Icone = op.icon;
                const ativo = form.tipoPagamento === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => atualizar('tipoPagamento', op.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      ativo
                        ? 'border-indigo-600 bg-indigo-50/40'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Icone size={18} className={ativo ? 'text-indigo-600' : 'text-slate-400'} />
                    <div>
                      <p className={`text-sm font-bold ${ativo ? 'text-indigo-600' : 'text-slate-600'}`}>
                        {op.label}
                      </p>
                      <p className="text-[10px] text-slate-400">{op.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data Base */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-600">
              {form.tipoPagamento === 'pronto' ? 'Data de Pagamento' : 'Data da Entrada Inicial'}
            </label>
            <input
              type="date"
              value={form.dataEntrada}
              onChange={e => atualizar('dataEntrada', e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Blocos do Fracionamento */}
          {form.tipoPagamento === 'entrada_semanal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Valor de Entrada
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">€</span>
                    <input
                      type="number" min="0" step="0.01" placeholder="100.00"
                      value={form.valorEntrada}
                      onChange={e => atualizar('valorEntrada', e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-lg bg-white text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Prestação Semanal
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">€</span>
                    <input
                      type="number" min="0" step="0.01"
                      placeholder={parcelaCalculada() > 0 ? parcelaCalculada().toFixed(2) : '50.00'}
                      value={form.parcelaSemanal}
                      onChange={e => atualizar('parcelaSemanal', e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-lg bg-white text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  {parcelaCalculada() > 0 && !form.parcelaSemanal && (
                    <p className="text-[10px] text-slate-400">
                      Remanescente: {parcelaCalculada().toFixed(2)}€ (sugestão)
                    </p>
                  )}
                </div>
              </div>

              {/* Data da Primeira Prestação */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <Calendar size={15} className="text-indigo-600" />
                  Data de Lançamento da Primeira Prestação
                </label>
                <input
                  type="date"
                  value={form.dataPrimeiraParcela}
                  onChange={e => atualizar('dataPrimeiraParcela', e.target.value)}
                  className="w-full px-4 py-3 border border-indigo-200 rounded-xl bg-indigo-50/10 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock size={10} /> Programada para 7 dias após o registo de entrada. Editável.
                </p>
              </div>

              {/* Pré-visualização Simulada do Cronograma */}
              {calendarioPreview.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <CalendarDays size={13} className="text-indigo-600" />
                    Simulação do Cronograma — {calendarioPreview.length} parcelas
                  </p>
                  <div className="rounded-xl border border-slate-100 overflow-hidden max-h-52 overflow-y-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 font-bold text-slate-400 uppercase tracking-wider">#</th>
                          <th className="px-3 py-2 font-bold text-slate-400 uppercase tracking-wider">Data Programada</th>
                          <th className="px-3 py-2 font-bold text-slate-400 uppercase tracking-wider text-right">Montante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {calendarioPreview.map((p) => (
                          <tr key={p.numero} className={p.ultima ? 'bg-emerald-50/40' : ''}>
                            <td className="px-3 py-2 font-bold text-slate-400">{p.numero}ª</td>
                            <td className="px-3 py-2 font-bold text-slate-700">{fmtData(p.data)}</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-700">
                              {p.valor.toFixed(2)}€
                              {p.ultima && <span className="ml-1 text-[9px] text-emerald-600">(final)</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback do Form */}
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
              className="flex-1 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loadingCriar ? (
                <><Loader2 size={15} className="animate-spin" /> A registar...</>
              ) : (
                <><Shield size={15} /> Criar Caução</>
              )}
            </button>
          </div>
        </div>
      )}

      {caucaoAtiva && (
        <p className="text-center text-xs text-slate-400 pt-2">
          O plano de depósito de segurança ativo deve ser quitado/liquidado para se habilitar um novo.
        </p>
      )}

      {/* Histórico Consolidado de Planos Encerrados */}
      {caucaoLiquidadas.length > 0 && (
        <div>
          <button
            onClick={() => setMostrarHistorico(!mostrarHistorico)}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
          >
            {mostrarHistorico ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Histórico ({caucaoLiquidadas.length} liquidada{caucaoLiquidadas.length > 1 ? 's' : ''})
          </button>

          {mostrarHistorico && (
            <div className="mt-3 space-y-2">
              {caucaoLiquidadas.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-600">
                        Caução de {Number(c.valorTotal).toFixed(2)}€
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {c.tipoPagamento === 'pronto'
                          ? `Amortizada a pronto${c.dataEntrada ? ` em ${fmtData(c.dataEntrada)}` : ''}`
                          : `${c.parcelaSemanal}€/semana · Início a ${fmtData(c.dataPrimeiraParcela)}`
                        }
                        {c.liquidadaEm && ` · Encerrada a ${fmtData(c.liquidadaEm)}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg uppercase">
                    Liquidada
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