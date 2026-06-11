/**
 * GestaoLeads.jsx
 * Localização: src/pages/GestaoLeads.jsx
 *
 * Painel de CRM para gestão em tempo real das leads públicas captadas na Landing Page.
 * Apresenta funil de estados, notas internas, diário de triagem e uma Agenda Diária consolidada,
 * agrupando todas as ações futuras em atraso, para hoje e planeadas de forma a definir prioridades de contacto.
 */

import React, { useState, useEffect } from 'react';
import { 
  UserCheck, PhoneCall, Trash2, CheckCircle2, XCircle, 
  Clock, FileText, Loader2, ArrowRight, UserPlus, Filter, Tag, 
  MessageSquare, CalendarDays, CalendarCheck, AlertTriangle
} from 'lucide-react';
import { db } from '../firebase'; 
import { useAuth } from '../context/AuthContext';
import { 
  collection, query, onSnapshot, updateDoc, 
  doc, addDoc, deleteDoc 
} from 'firebase/firestore';
import { formatCurrency, formatDatePT } from '../utils/formatters';
import { logAcaoGlobal } from '../utils/logger';

export default function GestaoLeads() {
  const { userData } = useAuth();

  // ─── ESTADOS DE VISTA ( CRM vs AGENDA DIÁRIA ) ─────────────────────────────
  const [vistaAtiva, setVistaAtiva] = useState('pipeline'); // 'pipeline' | 'agenda'

  // ─── ESTADOS DE DADOS ─────────────────────────────────────────────────────
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leadSelecionada, setLeadSelecionada] = useState(null);
  
  // Notas e Triagem
  const [novaNota, setNovaNota] = useState("");
  const [loadingAcao, setLoadingAcao] = useState(false);

  // Lógica de Ações Futuras (Agenda com campo de descrição de texto livre manual)
  const [novaAcao, setNovaAcao] = useState({ descricao: '', data: '' });

  // Filtros de pesquisa
  const [filtroEstado, setFaqFiltroEstado] = useState("todos"); // 'todos', 'novo', 'contacto_iniciado', 'convertido', 'perdido'
  const [filtroOrigem, setFaqFiltroOrigem] = useState("todos"); // 'todos', 'eguia_onboarding', 'procura_viatura', 'isca_ebook'

  // Obter data de hoje no formato ISO YYYY-MM-DD para o fuso horário português
  const hojeStr = new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');

  // ─── SUBSCRICAÇÃO EM TEMPO REAL (FIRESTORE) ───────────────────────────────
  useEffect(() => {
    setLoading(true);
    const qLeads = query(collection(db, 'leads_captadas'));

    const unsubscribe = onSnapshot(qLeads, (snap) => {
      const listaLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      listaLeads.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
      setLeads(listaLeads);
      setLoading(false);

      if (leadSelecionada) {
        const atualizada = listaLeads.find(l => l.id === leadSelecionada.id);
        if (atualizada) setLeadSelecionada(atualizada);
      }
    }, (error) => {
      console.error("[CRM GestaoLeads] Erro de sincronização:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [leadSelecionada?.id]);

  // ─── COMPILAÇÃO E CONSOLIDAÇÃO DE TAREFAS TOTAIS (AGENDA CRM) ─────────────
  
  const obterTodasAcoesPendentes = () => {
    const acoes = [];
    leads.forEach(lead => {
      (lead.agendaAcoes || []).forEach(act => {
        if (act.status === 'pendente') {
          acoes.push({
            ...act,
            leadId: lead.id,
            leadNome: lead.nome,
            leadTelemovel: lead.telemovel,
            leadEmail: lead.email || '',
            leadOrigem: lead.origem
          });
        }
      });
    });
    // Ordenar por data cronológica (mais antigas/atrasadas primeiro para ação urgente)
    return acoes.sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
  };

  const acoesPendentesTotais = obterTodasAcoesPendentes();

  // Dividir as ações consolidadas por nível de prioridade diária
  const acoesAtrasadas = acoesPendentesTotais.filter(a => a.dataPrevista < hojeStr);
  const acoesHoje = acoesPendentesTotais.filter(a => a.dataPrevista === hojeStr);
  const acoesFuturas = acoesPendentesTotais.filter(a => a.dataPrevista > hojeStr);

  // ─── AÇÕES DE GESTÃO DO CRM ───────────────────────────────────────────────

  // 1. Atualizar o estado da Lead no funil
  const handleAlterarEstado = async (leadId, novoEstado) => {
    setLoadingAcao(true);
    try {
      await updateDoc(doc(db, 'leads_captadas', leadId), {
        estado: novoEstado,
        atualizadoEm: new Date().toISOString()
      });

      await logAcaoGlobal(
        userData?.nome || 'Sistema',
        'CRM - Alteração de Estado',
        'Leads',
        `Lead ID: ${leadId} alterada para o estado: ${novoEstado}`,
        leadId
      );
    } catch (err) {
      console.error("Erro ao alterar estado:", err);
      alert("Não foi possível atualizar o estado da lead.");
    } finally {
      setLoadingAcao(false);
    }
  };

  // 2. Adicionar nota/comentário de triagem à Lead
  const handleAdicionarNota = async () => {
    if (!novaNota.trim() || !leadSelecionada) return;
    setLoadingAcao(true);

    try {
      const notasAtuais = leadSelecionada.notesInternas || leadSelecionada.notasInternas || [];
      const novaNotaObj = {
        autor: userData?.nome || 'Gestor',
        texto: novaNota.trim(),
        criadoEm: new Date().toISOString()
      };

      await updateDoc(doc(db, 'leads_captadas', leadSelecionada.id), {
        notasInternas: [...notasAtuais, novaNotaObj]
      });

      setNovaNota("");
    } catch (err) {
      console.error("Erro ao adicionar nota:", err);
      alert("Não foi possível registar o comentário.");
    } finally {
      setLoadingAcao(false);
    }
  };

  // 3. Agendar uma Ação Futura
  const handleAgendarAcaoFutura = async () => {
    if (!novaAcao.descricao.trim() || !novaAcao.data || !leadSelecionada) {
      alert("Por favor, preencha o detalhe da ação manual e escolha uma data futura.");
      return;
    }
    setLoadingAcao(true);

    try {
      const acoesAtuais = leadSelecionada.agendaAcoes || [];
      const novaAcaoObj = {
        id: `ACT_${Date.now()}`,
        descricao: novaAcao.descricao.trim(),
        dataPrevista: novaAcao.data,
        status: 'pendente',
        criadoEm: new Date().toISOString(),
        criadoPor: userData?.nome || 'Gestor'
      };

      await updateDoc(doc(db, 'leads_captadas', leadSelecionada.id), {
        agendaAcoes: [...acoesAtuais, novaAcaoObj]
      });

      setNovaAcao({ descricao: '', data: '' });
      alert("Ação futura agendada com sucesso!");
    } catch (err) {
      console.error("Erro ao agendar ação:", err);
      alert("Não foi possível registar o agendamento.");
    } finally {
      setLoadingAcao(false);
    }
  };

  // 4. Marcar Ação Futura como Concluída
  const handleConcluirAcaoFutura = async (leadId, acaoId) => {
    setLoadingAcao(true);

    // Encontra o documento da lead associada à ação
    const leadAlvo = leads.find(l => l.id === leadId);
    if (!leadAlvo) return;

    try {
      const acoesAtualizadas = (leadAlvo.agendaAcoes || []).map(act => {
        if (act.id === acaoId) {
          return { ...act, status: 'concluida', concluidaEm: new Date().toISOString() };
        }
        return act;
      });

      await updateDoc(doc(db, 'leads_captadas', leadId), {
        agendaAcoes: acoesAtualizadas
      });
    } catch (err) {
      console.error("Erro ao concluir ação:", err);
    } finally {
      setLoadingAcao(false);
    }
  };

  // 5. AUTOMATIZAÇÃO: Converter Lead em Ficha Oficial de Motorista no ERP
  const handleConverterParaMotorista = async () => {
    if (!leadSelecionada) return;

    if (!window.confirm(`Confirma a conversão da lead "${leadSelecionada.nome}" em Motorista no ERP? Isto criará uma ficha de onboarding no sistema.`)) {
      return;
    }

    setLoadingAcao(true);
    try {
      const novoMotoristaPayload = {
        nome: leadSelecionada.nome,
        email: leadSelecionada.email || '', // Garante string vazia se não fornecido
        telemovel: leadSelecionada.telemovel,
        nif: '---', 
        iban: '---',
        status: 'onboarding', 
        criadoEm: new Date().toISOString(),
        origemLeadId: leadSelecionada.id
      };

      const docRef = await addDoc(collection(db, 'motoristas'), novoMotoristaPayload);

      await updateDoc(doc(db, 'leads_captadas', leadSelecionada.id), {
        estado: 'convertido',
        motoristaCriadoId: docRef.id,
        atualizadoEm: new Date().toISOString()
      });

      await logAcaoGlobal(
        userData?.nome || 'Sistema',
        'CRM - Conversão de Lead',
        'Leads',
        `Lead "${leadSelecionada.nome}" convertida em motorista oficial (ID: ${docRef.id}).`,
        leadSelecionada.id
      );

      alert(`Lead convertida com sucesso! Nova ficha de onboarding criada para o motorista.`);
    } catch (err) {
      console.error("Erro na conversão:", err);
      alert("Erro ao realizar a conversão transacional para ficha de motorista.");
    } finally {
      setLoadingAcao(false);
    }
  };

  // 6. Eliminar Lead definitivamente
  const handleEliminarLead = async (leadId) => {
    if (!window.confirm("Deseja eliminar este registo de lead de forma definitiva do sistema?")) return;
    setLoadingAcao(true);
    try {
      await deleteDoc(doc(db, 'leads_captadas', leadId));
      setLeadSelecionada(null);
      alert("Registo eliminado.");
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAcao(false);
    }
  };

  // --- FILTROS DE PROCESSAMENTO ---
  const leadsFiltradas = leads.filter(l => {
    const checkEstado = filtroEstado === "todos" ? true : l.estado === filtroEstado;
    const checkOrigem = filtroOrigem === "todos" ? true : l.origem === filtroOrigem;
    return checkEstado && checkOrigem;
  });

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* ─── Cabeçalho do Painel CRM ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Gestão de Leads (CRM)</h2>
          <p className="text-slate-500 text-xs">Acompanhamento, triagem e conversão de candidatos e pedidos de frota.</p>
        </div>
      </div>

      {/* ─── Filtros Rápidos de Controlo ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs text-left">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter size={14} /> Filtros:
          </div>

          <select 
            value={filtroEstado}
            onChange={e => setFaqFiltroEstado(e.target.value)}
            className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-slate-100"
          >
            <option value="todos">Todos os Estados</option>
            <option value="novo">🆕 Novas Leads</option>
            <option value="contacto_iniciado">📞 Contacto Iniciado</option>
            <option value="convertido">🟢 Convertidos</option>
            <option value="perdido">🔴 Perdidos</option>
          </select>

          <select 
            value={filtroOrigem}
            onChange={e => setFaqFiltroOrigem(e.target.value)}
            className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-slate-100"
          >
            <option value="todos">Todas as Origens</option>
            <option value="eguia_onboarding">📖 eGuia Onboarding</option>
            <option value="procura_viatura">🚗 Procura Viatura (Aluguer)</option>
            <option value="isca_ebook">📖 Download de Guia (Legado)</option>
          </select>
        </div>

        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Registos Localizados: {leadsFiltradas.length}
        </div>
      </div>

      {/* ─── Grelha Principal Split-Pane ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Lado Esquerdo: Lista de Leads / Agenda Diária por Separador */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs p-5 space-y-4">
          
          {/* Seletor de Separador da Coluna Esquerda */}
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit select-none">
            <button
              type="button"
              onClick={() => setVistaAtiva('pipeline')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                vistaAtiva === 'pipeline' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              📇 Lista de Leads ({leadsFiltradas.length})
            </button>
            <button
              type="button"
              onClick={() => setVistaAtiva('agenda')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                vistaAtiva === 'agenda' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              📅 Agenda Diária 
              {acoesPendentesTotais.length > 0 && (
                <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {acoesPendentesTotais.length}
                </span>
              )}
            </button>
          </div>

          {/* VISTA A: LISTAGEM DE LEADS TRADICIONAL */}
          {vistaAtiva === 'pipeline' && (
            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="animate-spin mb-3" size={24} />
                  <p className="text-xs font-bold">A carregar funil de leads...</p>
                </div>
              ) : leadsFiltradas.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-2">
                  <Tag size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold">Sem leads localizadas para os filtros ativos.</p>
                </div>
              ) : (
                leadsFiltradas.map((lead) => {
                  const selecionada = leadSelecionada?.id === lead.id;
                  return (
                    <button
                      type="button"
                      key={lead.id}
                      onClick={() => setLeadSelecionada(lead)}
                      className={`w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 transition-all hover:bg-slate-50 border-b border-slate-50 last:border-0 ${
                        selecionada ? 'bg-slate-50/80 border-r-4 border-indigo-600' : ''
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm truncate max-w-[150px] sm:max-w-[200px]">{lead.nome}</h4>
                          <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                            {formatDatePT(new Date(lead.criadoEm))}
                          </span>
                        </div>
                        
                        {/* Exibição condicional caso o email não exista */}
                        {lead.email ? (
                          <p className="text-xs text-slate-500 font-medium truncate max-w-[150px] sm:max-w-[250px]">{lead.email}</p>
                        ) : (
                          <p className="text-xs text-slate-400 font-medium italic truncate max-w-[150px] sm:max-w-[250px]">Sem email (Contacto exclusivo)</p>
                        )}
                        
                        {/* Estilização por origem da lead */}
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-lg border ${
                          lead.origem === 'procura_viatura' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : lead.origem === 'eguia_onboarding'
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {lead.origem === 'procura_viatura' ? '🚗 Aluguer' : lead.origem === 'eguia_onboarding' ? '📖 eGuia Onboarding' : '📖 Ebook (Legado)'}
                        </span>
                      </div>

                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap ${
                        lead.estado === 'novo' ? 'bg-blue-100 text-blue-700' :
                        lead.estado === 'contacto_iniciado' ? 'bg-amber-100 text-amber-700' :
                        lead.estado === 'convertido' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {lead.estado === 'contacto_iniciado' ? '📞 Em contacto' : lead.estado}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* VISTA B: AGENDA DIÁRIA CONSOLIDADA (AGRUPADA POR DIA E PRIORIDADE) */}
          {vistaAtiva === 'agenda' && (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
              
              {/* 🔴 BLOCO 1: CONTACTOS EM ATRASO (URGENTE) */}
              <div className="space-y-2 text-left">
                <h4 className="text-xs font-black text-red-600 flex items-center gap-1.5 px-1 uppercase tracking-wider">
                  <AlertTriangle size={14} className="animate-pulse" /> Contactos em Atraso (Urgente)
                </h4>
                {acoesAtrasadas.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-medium italic pl-3">Nenhum contacto em atraso.</p>
                ) : (
                  acoesAtrasadas.map(act => (
                    <div 
                      key={act.id}
                      onClick={() => setLeadSelecionada(leads.find(l => l.id === act.leadId))}
                      className="flex justify-between items-center p-3 rounded-2xl border border-red-100 bg-red-50/40 hover:bg-red-50 transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="min-w-0 pr-2 space-y-0.5">
                        <p className="text-xs font-bold text-slate-800 truncate">{act.leadNome} — <span className="font-semibold text-slate-500">{act.descricao}</span></p>
                        <p className="text-[9px] text-red-500 font-black uppercase">Atrasado desde: {formatDatePT(new Date(act.dataPrevista))}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleConcluirAcaoFutura(act.leadId, act.id); }}
                        className="p-1.5 text-red-500 hover:bg-red-100/50 rounded-lg shrink-0 transition-colors"
                        title="Marcar como Feito"
                      >
                        <CalendarCheck size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* 🔵 BLOCO 2: CONTACTOS PARA HOJE (PRIORITÁRIO) */}
              <div className="space-y-2 text-left">
                <h4 className="text-xs font-black text-blue-600 flex items-center gap-1.5 px-1 uppercase tracking-wider">
                  <Clock size={14} /> Contactos para Hoje (Prioritário)
                </h4>
                {acoesHoje.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-medium italic pl-3">Nenhuma ação agendada para hoje.</p>
                ) : (
                  acoesHoje.map(act => (
                    <div 
                      key={act.id}
                      onClick={() => setLeadSelecionada(leads.find(l => l.id === act.leadId))}
                      className="flex justify-between items-center p-3 rounded-2xl border border-blue-100 bg-blue-50/30 hover:bg-blue-50 transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="min-w-0 pr-2 space-y-0.5">
                        <p className="text-xs font-bold text-slate-800 truncate">{act.leadNome} — <span className="font-semibold text-slate-500">{act.descricao}</span></p>
                        <p className="text-[9px] text-blue-500 font-black uppercase">Agendado para Hoje ({formatDatePT(new Date(act.dataPrevista))})</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleConcluirAcaoFutura(act.leadId, act.id); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-100/50 rounded-lg shrink-0 transition-colors"
                        title="Marcar como Feito"
                      >
                        <CalendarCheck size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* 📅 BLOCO 3: PRÓXIMOS CONTACTOS AGENDADOS (FUTURO) */}
              <div className="space-y-2 text-left">
                <h4 className="text-xs font-black text-slate-400 flex items-center gap-1.5 px-1 uppercase tracking-wider">
                  <CalendarDays size={14} /> Planeamento Futuro
                </h4>
                {acoesFuturas.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-medium italic pl-3">Sem agendamentos futuros pendentes.</p>
                ) : (
                  acoesFuturas.map(act => (
                    <div 
                      key={act.id}
                      onClick={() => setLeadSelecionada(leads.find(l => l.id === act.leadId))}
                      className="flex justify-between items-center p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="min-w-0 pr-2 space-y-0.5">
                        <p className="text-xs font-bold text-slate-700 truncate">{act.leadNome} — <span className="font-semibold text-slate-500">{act.descricao}</span></p>
                        <p className="text-[9px] text-slate-400 font-black uppercase">Agendado para: {formatDatePT(new Date(act.dataPrevista))}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleConcluirAcaoFutura(act.leadId, act.id); }}
                        className="p-1.5 text-slate-400 hover:bg-slate-200/50 rounded-lg shrink-0 transition-colors"
                        title="Marcar como Feito"
                      >
                        <CalendarCheck size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>

        {/* Lado Direito: Detalhe, Ações e Agenda individual da Lead */}
        <div className="lg:col-span-5 space-y-6">
          {leadSelecionada ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 text-left animate-in fade-in duration-200">
              
              {/* Header do Perfil da Lead */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="space-y-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-base truncate">{leadSelecionada.nome}</h3>
                  {leadSelecionada.email ? (
                    <p className="text-xs text-slate-500 font-semibold">{leadSelecionada.email}</p>
                  ) : (
                    <p className="text-xs text-slate-400 font-semibold italic">Sem email (Contacto exclusivo)</p>
                  )}
                  <p className="text-xs text-indigo-600 font-bold">{leadSelecionada.telemovel}</p>
                </div>
                <button
                  onClick={() => handleEliminarLead(leadSelecionada.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar Lead"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Mensagem Pública Captada */}
              {leadSelecionada.mensagemAdicional && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nota de Entrada (Formulário)</span>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{leadSelecionada.mensagemAdicional}</p>
                </div>
              )}

              {/* Ações Rápidas de Mudança de Funil */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Controlo de Funil</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleAlterarEstado(leadSelecionada.id, 'contacto_iniciado')}
                    disabled={loadingAcao || leadSelecionada.estado === 'contacto_iniciado'}
                    className="flex items-center justify-center gap-1.5 py-2 px-1 border border-amber-200 hover:bg-amber-50 text-amber-700 font-semibold rounded-xl text-xs transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <PhoneCall size={11} /> Contactar
                  </button>
                  <button
                    onClick={() => handleAlterarEstado(leadSelecionada.id, 'convertido')}
                    disabled={loadingAcao || leadSelecionada.estado === 'convertido'}
                    className="flex items-center justify-center gap-1.5 py-2 px-1 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-semibold rounded-xl text-xs transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <CheckCircle2 size={11} /> Converter
                  </button>
                  <button
                    onClick={() => handleAlterarEstado(leadSelecionada.id, 'perdido')}
                    disabled={loadingAcao || leadSelecionada.estado === 'perdido'}
                    className="flex items-center justify-center gap-1.5 py-2 px-1 border border-red-200 hover:bg-red-50 text-red-600 font-semibold rounded-xl text-xs transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <XCircle size={11} /> Descartar
                  </button>
                </div>

                {/* BOTÃO TRANSACIONAL: Converter Lead em Motorista Oficial do ERP */}
                {leadSelecionada.estado !== 'convertido' && (
                  <button
                    onClick={handleConverterParaMotorista}
                    disabled={loadingAcao}
                    className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 cursor-pointer"
                  >
                    {loadingAcao ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <UserPlus size={13} />
                    )}
                    Converter em Motorista (Ficha ERP)
                  </button>
                )}

                {leadSelecionada.estado === 'convertido' && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Esta lead foi convertida em motorista oficial!</span>
                  </div>
                )}
              </div>

              {/* 📅 SECÇÃO DE AGENDA DE AÇÕES FUTURAS INDIVIDUAL DA LEAD */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <CalendarDays size={12} /> Agenda da Lead Selecionada
                </span>

                {/* Lista de Ações futuras desta lead */}
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {(!leadSelecionada.agendaAcoes || leadSelecionada.agendaAcoes.length === 0) ? (
                    <p className="text-slate-400 text-[10px] font-medium italic">Sem ações futuras agendadas.</p>
                  ) : (
                    [...leadSelecionada.agendaAcoes]
                      .sort((a,b) => a.dataPrevista.localeCompare(b.dataPrevista))
                      .map((act) => {
                        const concluida = act.status === 'concluida';
                        return (
                          <div 
                            key={act.id} 
                            className={`flex justify-between items-center p-2.5 rounded-xl border text-[11px] ${
                              concluida 
                                ? 'bg-slate-50 border-slate-100 opacity-60' 
                                : act.dataPrevista < hojeStr 
                                  ? 'bg-red-50 border-red-100' 
                                  : 'bg-indigo-50/40 border-indigo-100/50'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className={`font-bold ${concluida ? 'line-through text-slate-400' : 'text-slate-700'}`}>{act.descricao}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Agendado para: {formatDatePT(new Date(act.dataPrevista))}</p>
                            </div>
                            
                            {!concluida ? (
                              <button
                                type="button"
                                onClick={() => handleConcluirAcaoFutura(leadSelecionada.id, act.id)}
                                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors flex-shrink-0 cursor-pointer"
                                title="Marcar como Concluída"
                              >
                                <CalendarCheck size={14} />
                              </button>
                            ) : (
                              <span className="text-[8px] font-black uppercase text-emerald-600 px-1.5 py-0.5 rounded bg-emerald-50">Feito</span>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Formulário rápido para agendar ação futura manual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-400 mb-0.5">Ação (Preenchimento Manual)</span>
                    <input
                      type="text"
                      placeholder="Ex: Ligar novamente, Enviar WhatsApp..."
                      value={novaAcao.descricao}
                      onChange={e => setNovaAcao({ ...novaAcao, descricao: e.target.value })}
                      className="p-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-400 mb-0.5">Data Prevista</span>
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        min={hojeStr}
                        value={novaAcao.data}
                        onChange={e => setNovaAcao({ ...novaAcao, data: e.target.value })}
                        className="flex-1 p-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAgendarAcaoFutura}
                        disabled={loadingAcao || !novaAcao.data || !novaAcao.descricao.trim()}
                        className="px-2.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-950 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco de Notas / Comentários Internos */}
              <div className="border-t border-slate-100 pt-4 space-y-3.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare size={12} /> Diário de Triagem & Notas Internas
                </span>

                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {(!leadSelecionada.notasInternas || leadSelecionada.notasInternas.length === 0) ? (
                    <p className="text-slate-400 text-[10px] font-medium italic">Sem notas registadas.</p>
                  ) : (
                    leadSelecionada.notasInternas.map((nota, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                          <span>{nota.autor}</span>
                          <span>{formatDatePT(new Date(nota.criadoEm))}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{nota.texto}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Registar nota interna (ex: Pretende iniciar para a semana)..."
                    value={novaNota}
                    onChange={e => setNovaNota(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdicionarNota()}
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={handleAdicionarNota}
                    disabled={loadingAcao || !novaNota.trim()}
                    className="px-3 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-950 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 py-16 text-center text-slate-400 space-y-2">
              <FileText size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold">Selecione uma lead</p>
              <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                Clique numa lead da lista esquerda para gerir o contacto, agendar tarefas, converter ou adicionar notas.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}