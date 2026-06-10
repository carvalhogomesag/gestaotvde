/**
 * GestaoLeads.jsx
 * Localização: src/pages/GestaoLeads.jsx
 *
 * Painel de CRM para gestão em tempo real das leads públicas captadas na Landing Page.
 * Permite filtrar por origem, alterar estados de funil, registar notas internas de triagem
 * e converter leads diretamente em novos motoristas no ERP.
 */

import React, { useState, useEffect } from 'react';
import { 
  UserCheck, PhoneCall, Trash2, CheckCircle2, XCircle, 
  Clock, FileText, Loader2, ArrowRight, UserPlus, Filter, Tag, MessageSquare
} from 'lucide-react';
import { db } from '../firebase'; 
import { useAuth } from '../context/AuthContext';
import { 
  collection, query, onSnapshot, updateDoc, 
  doc, addDoc, serverTimestamp, deleteDoc 
} from 'firebase/firestore';
import { formatCurrency, formatDatePT } from '../utils/formatters';
import { logAcaoGlobal } from '../utils/logger';

export default function GestaoLeads() {
  const { userData } = useAuth();

  // ─── ESTADOS DE DADOS ─────────────────────────────────────────────────────
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leadSelecionada, setLeadSelecionada] = useState(null);
  const [novaNota, setNovaNota] = useState("");
  const [loadingAcao, setLoadingAcao] = useState(false);

  // Filtros de pesquisa
  const [filtroEstado, setFaqFiltroEstado] = useState("todos"); // 'todos', 'novo', 'contacto_iniciado', 'convertido', 'perdido'
  const [filtroOrigem, setFaqFiltroOrigem] = useState("todos"); // 'todos', 'isca_ebook', 'procura_viatura'

  // ─── SUBSCRICAÇÃO EM TEMPO REAL (FIRESTORE) ───────────────────────────────
  useEffect(() => {
    setLoading(true);
    const qLeads = query(collection(db, 'leads_captadas'));

    const unsubscribe = onSnapshot(qLeads, (snap) => {
      const listaLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordena por data decrescente (mais recentes primeiro)
      listaLeads.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
      setLeads(listaLeads);
      setLoading(false);

      // Sincroniza a lead selecionada para ver as atualizações em tempo real
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
      const notasAtuais = leadSelecionada.notasInternas || [];
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

  // 3. AUTOMATIZAÇÃO: Converter Lead em Ficha Oficial de Motorista no ERP
  const handleConverterParaMotorista = async () => {
    if (!leadSelecionada) return;

    if (!window.confirm(`Confirma a conversão da lead "${leadSelecionada.nome}" em Motorista no ERP? Isto criará uma ficha de onboarding no sistema.`)) {
      return;
    }

    setLoadingAcao(true);
    try {
      // A. Criar ficha de motorista associada na coleção 'motoristas'
      const novoMotoristaPayload = {
        nome: leadSelecionada.nome,
        email: leadSelecionada.email,
        telemovel: leadSelecionada.telemovel,
        nif: '---', // Para preenchimento no onboarding
        iban: '---',
        status: 'onboarding', // Estado inicial da ficha de condutor
        criadoEm: new Date().toISOString(),
        origemLeadId: leadSelecionada.id
      };

      const docRef = await addDoc(collection(db, 'motoristas'), novoMotoristaPayload);

      // B. Atualizar estado da Lead para 'convertido'
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

  // 4. Eliminar Lead definitivamente
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

  // ─── PROCESSAMENTO DE FILTROS ─────────────────────────────────────────────
  const leadsFiltradas = leads.filter(l => {
    const checkEstado = filtroEstado === "todos" ? true : l.estado === filtroEstado;
    const checkOrigem = filtroOrigem === "todos" ? true : l.origem === filtroOrigem;
    return checkEstado && checkOrigem;
  });

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* ─── Cabçalho do Painel CRM ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Gestão de Leads (CRM)</h2>
          <p className="text-slate-500 text-xs">Acompanhamento, triagem e conversão de candidatos e pedidos de frota.</p>
        </div>
      </div>

      {/* ─── Filtros Rápidos de Controlo ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter size={14} /> Filtros:
          </div>

          {/* Estado do funil */}
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

          {/* Origem da lead */}
          <select 
            value={filtroOrigem}
            onChange={e => setFaqFiltroOrigem(e.target.value)}
            className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-slate-100"
          >
            <option value="todos">Todas as Origens</option>
            <option value="isca_ebook">📖 Download de Guia (Ebook)</option>
            <option value="procura_viatura">🚗 Procura Viatura (Aluguer)</option>
          </select>
        </div>

        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Registos Localizados: {leadsFiltradas.length}
        </div>
      </div>

      {/* ─── Grelha Principal Split-Pane ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Lado Esquerdo: Lista de Leads (7 Colunas) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="animate-spin mb-3" size={24} />
              <p className="text-xs font-bold">A carregar funil de leads...</p>
            </div>
          ) : leadsFiltradas.length === 0 ? (
            <div className="text-center py-20 text-slate-400 space-y-2">
              <Tag size={28} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold">Sem leads localizadas com os filtros ativos.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {leadsFiltradas.map((lead) => {
                const selecionada = leadSelecionada?.id === lead.id;
                return (
                  <button
                    key={lead.id}
                    onClick={() => setLeadSelecionada(lead)}
                    className={`w-full text-left p-5 flex items-center justify-between gap-4 transition-all hover:bg-slate-50 ${
                      selecionada ? 'bg-slate-50/80 border-r-4 border-indigo-600' : ''
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm truncate max-w-[200px] sm:max-w-[250px]">{lead.nome}</h4>
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                          {formatDatePT(new Date(lead.criadoEm))}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-[300px]">{lead.email}</p>
                      
                      {/* Origem em Badge */}
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-lg border ${
                        lead.origem === 'procura_viatura' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}>
                        {lead.origem === 'procura_viatura' ? '🚗 Aluguer' : '📖 Ebook'}
                      </span>
                    </div>

                    {/* Estado em Badge */}
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
              })}
            </div>
          )}
        </div>

        {/* Lado Direito: Detalhe e Ações Rápidas (5 Colunas) */}
        <div className="lg:col-span-5 space-y-6">
          {leadSelecionada ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 text-left animate-in fade-in duration-200">
              
              {/* Header do Perfil da Lead */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="space-y-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-base truncate">{leadSelecionada.nome}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{leadSelecionada.email}</p>
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAlterarEstado(leadSelecionada.id, 'contacto_iniciado')}
                    disabled={loadingAcao || leadSelecionada.estado === 'contacto_iniciado'}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 border border-amber-200 hover:bg-amber-50 text-amber-700 font-semibold rounded-xl text-xs transition-colors disabled:opacity-40"
                  >
                    <PhoneCall size={12} /> Contactar
                  </button>
                  <button
                    onClick={() => handleAlterarEstado(leadSelecionada.id, 'perdido')}
                    disabled={loadingAcao || leadSelecionada.estado === 'perdido'}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 border border-red-200 hover:bg-red-50 text-red-600 font-semibold rounded-xl text-xs transition-colors disabled:opacity-40"
                  >
                    <XCircle size={12} /> Descartar
                  </button>
                </div>

                {/* BOTÃO TRANSACIONAL: Converter Lead em Motorista */}
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
                    Converter em Motorista (ERP)
                  </button>
                )}

                {leadSelecionada.estado === 'convertido' && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Esta lead foi convertida em motorista oficial!</span>
                  </div>
                )}
              </div>

              {/* Bloco de Notas / Comentários Internos */}
              <div className="border-t border-slate-100 pt-4 space-y-3.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare size={12} /> Diário de Triagem & Acompanhamento
                </span>

                {/* Lista de Notas já gravadas */}
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
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

                {/* Campo para adicionar nova nota */}
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
                    className="px-3 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-950 transition-colors disabled:opacity-40"
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
                Clique numa lead da lista esquerda para gerir o contacto, converter ou adicionar notas.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}