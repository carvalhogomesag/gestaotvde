/**
 * TaxaGestaoTab.jsx
 * Localização: src/features/financeiro/tabs/TaxaGestaoTab.jsx
 *
 * Separador 2 do ModalFinanceiro.
 * Configura a taxa de gestão a cobrar automaticamente em cada fecho semanal.
 * Suporta dois modos: valor fixo (€) ou percentagem sobre a receita bruta (%).
 */

import React, { useState, useEffect } from 'react';
import {
  Settings2, CheckCircle2, AlertCircle,
  Loader2, Info, ToggleLeft, ToggleRight, Euro, Percent
} from 'lucide-react';

export default function TaxaGestaoTab({
  configuracao,
  nomeEntidade,
  onSalvar
}) {
  // ── Estado do formulário — inicializado com configuração existente ────────
  const [form, setForm] = useState({
    ativo:          true,
    tipoTaxaGestao: 'fixo',
    taxaGestao:     '',
    taxaGestaoPct:  ''
  });

  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [feedback, setFeedback]           = useState(null);
  const [alterado, setAlterado]           = useState(false);

  // Preenche o formulário convertendo valores de base de dados para escala humana (ex: 0.15 -> 15%)
  useEffect(() => {
    if (configuracao) {
      setForm({
        ativo:          configuracao.ativo          ?? true,
        tipoTaxaGestao: configuracao.tipoTaxaGestao ?? 'fixo',
        taxaGestao:     configuracao.taxaGestao     ?? '',
        taxaGestaoPct:  configuracao.taxaGestaoPct  
          ? Number((configuracao.taxaGestaoPct * 100).toFixed(2)) 
          : ''
      });
    }
    setAlterado(false);
  }, [configuracao]);

  const atualizar = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    setAlterado(true);
    setFeedback(null);
  };

  // ── Salvar configuração ───────────────────────────────────────────────────
  const handleSalvar = async () => {
    // Validação de inputs
    if (form.tipoTaxaGestao === 'fixo' && (!form.taxaGestao || Number(form.taxaGestao) <= 0)) {
      setFeedback({ tipo: 'erro', texto: 'Introduza um valor fixo superior a zero.' });
      return;
    }
    if (form.tipoTaxaGestao === 'percentagem') {
      const pct = Number(form.taxaGestaoPct);
      if (!form.taxaGestaoPct || pct <= 0 || pct > 100) {
        setFeedback({ tipo: 'erro', texto: 'Introduza uma percentagem válida entre 0.1% e 100%.' });
        return;
      }
    }

    setLoadingSalvar(true);
    try {
      const resultado = await onSalvar({
        ativo:          form.ativo,
        tipoTaxaGestao: form.tipoTaxaGestao,
        taxaGestao:     form.tipoTaxaGestao === 'fixo'        ? Number(form.taxaGestao)    : 0,
        taxaGestaoPct:  form.tipoTaxaGestao === 'percentagem' ? Number(form.taxaGestaoPct) / 100 : 0
      });
      
      setFeedback({
        tipo:  resultado.sucesso ? 'ok' : 'erro',
        texto: resultado.msg
      });
      
      if (resultado.sucesso) setAlterado(false);
    } catch (err) {
      setFeedback({ tipo: 'erro', texto: 'Erro ao guardar a configuração. Tente novamente.' });
    } finally {
      setLoadingSalvar(false);
    }
  };

  // ── Valor de pré-visualização (exemplo com receita de 1000€) ─────────────
  const exemploReceita   = 1000;
  const exemploTaxaFixa  = Number(form.taxaGestao  || 0);
  const exemploTaxaPct   = (Number(form.taxaGestaoPct || 0) / 100) * exemploReceita;
  const exemploValor     = form.tipoTaxaGestao === 'fixo' ? exemploTaxaFixa : exemploTaxaPct;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Estado Actual ─────────────────────────────────────────────────── */}
      <div className={`rounded-2xl p-5 border flex items-start gap-4 ${
        configuracao
          ? configuracao.ativo
            ? 'bg-emerald-50 border-emerald-100'
            : 'bg-slate-50 border-slate-200'
          : 'bg-amber-50 border-amber-100'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          configuracao
            ? configuracao.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
            : 'bg-amber-100 text-amber-700'
        }`}>
          <Settings2 size={20} />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm">
            {!configuracao
              ? 'Sem configuração definida'
              : configuracao.ativo
                ? `Taxa de gestão ativa — ${
                    configuracao.tipoTaxaGestao === 'fixo'
                      ? `${configuracao.taxaGestao}€ fixos/semana`
                      : `${(configuracao.taxaGestaoPct * 100).toFixed(1)}% da receita bruta`
                  }`
                : 'Taxa de gestão desativada'
            }
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {!configuracao
              ? 'Configure abaixo para ativar a cobrança automática no fecho semanal.'
              : configuracao.ativo
                ? 'Este valor é debitado automaticamente em cada fecho semanal.'
                : 'A cobrança automática está pausada para esta entidade.'
            }
          </p>
        </div>
      </div>

      {/* ── Toggle de Activação ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <p className="text-sm font-bold text-slate-700">Cobrança Automática</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Ative para debitar automaticamente em cada fecho semanal
          </p>
        </div>
        <button
          type="button"
          onClick={() => atualizar('ativo', !form.ativo)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            form.ativo
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
          }`}
        >
          {form.ativo ? (
            <><ToggleRight size={18} /> Ativa</>
          ) : (
            <><ToggleLeft  size={18} /> Inativa</>
          )}
        </button>
      </div>

      {/* ── Tipo e Valor da Taxa ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
          Tipo e Valor da Taxa
        </p>

        {/* Seletor de Tipo */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => atualizar('tipoTaxaGestao', 'fixo')}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
              form.tipoTaxaGestao === 'fixo'
                ? 'border-indigo-600 bg-indigo-50/40'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              form.tipoTaxaGestao === 'fixo'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-400'
            }`}>
              <Euro size={18} />
            </div>
            <div>
              <p className={`text-sm font-bold ${
                form.tipoTaxaGestao === 'fixo' ? 'text-indigo-600' : 'text-slate-600'
              }`}>
                Valor Fixo
              </p>
              <p className="text-[10px] text-slate-400">Débito estático recorrente</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => atualizar('tipoTaxaGestao', 'percentagem')}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
              form.tipoTaxaGestao === 'percentagem'
                ? 'border-indigo-600 bg-indigo-50/40'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              form.tipoTaxaGestao === 'percentagem'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-400'
            }`}>
              <Percent size={18} />
            </div>
            <div>
              <p className={`text-sm font-bold ${
                form.tipoTaxaGestao === 'percentagem' ? 'text-indigo-600' : 'text-slate-600'
              }`}>
                Percentagem
              </p>
              <p className="text-[10px] text-slate-400">% sobre a receita bruta</p>
            </div>
          </button>
        </div>

        {/* Campo do Valor */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
            {form.tipoTaxaGestao === 'fixo' ? '€' : '%'}
          </span>
          <input
            type="number"
            min="0"
            step={form.tipoTaxaGestao === 'fixo' ? '0.01' : '0.1'}
            max={form.tipoTaxaGestao === 'percentagem' ? '100' : undefined}
            placeholder={form.tipoTaxaGestao === 'fixo' ? '125.00' : '15.0'}
            value={form.tipoTaxaGestao === 'fixo' ? form.taxaGestao : form.taxaGestaoPct}
            onChange={e => atualizar(
              form.tipoTaxaGestao === 'fixo' ? 'taxaGestao' : 'taxaGestaoPct',
              e.target.value
            )}
            className="w-full pl-9 pr-4 py-4 border border-slate-200 rounded-2xl bg-white text-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Pré-visualização do Cálculo Dinâmico */}
        {exemploValor > 0 && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <Info size={16} className="text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Pré-visualização de cálculo</p>
              {form.tipoTaxaGestao === 'fixo' ? (
                <p className="text-xs text-slate-500 mt-0.5">
                  Serão debitados recorrentemente{' '}
                  <span className="font-bold text-indigo-600">{exemploTaxaFixa.toFixed(2)}€</span>{' '}
                  em cada fecho semanal de contas, independentemente do rendimento auferido.
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">
                  Numa semana de exemplo com <span className="font-bold">{exemploReceita}€</span> de receita bruta,
                  serão debitados{' '}
                  <span className="font-bold text-indigo-600">{exemploTaxaPct.toFixed(2)}€</span>{' '}
                  ({form.taxaGestaoPct}% × {exemploReceita}€).
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Feedback de Gravação ───────────────────────────────────────────── */}
      {feedback && (
        <div className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 ${
          feedback.tipo === 'ok'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {feedback.tipo === 'ok' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle  size={16} />
          )}
          {feedback.texto}
        </div>
      )}

      {/* ── Ações ──────────────────────────────────────────────────────────── */}
      <button
        onClick={handleSalvar}
        disabled={loadingSalvar || !alterado}
        className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
      >
        {loadingSalvar ? (
          <><Loader2 size={16} className="animate-spin" /> A guardar alterações...</>
        ) : (
          <><Settings2 size={16} /> Guardar Configuração</>
        )}
      </button>

      {!alterado && configuracao && (
        <p className="text-center text-xs text-slate-400">
          Altere alguma definição acima para habilitar o salvamento.
        </p>
      )}

    </div>
  );
}