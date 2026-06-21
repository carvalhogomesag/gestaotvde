/**
 * Dashboard.jsx
 * Localização: src/pages/Dashboard.jsx
 *
 * Página de controlo e monitorização do ERP.
 * Otimizado com:
 * - Filtros rápidos e ordenação integrada.
 * - Sincronização bidirecional dupla robusta (Turno A e Turno B).
 * - Mini-Dashboard analítico super compacto com KPIs da frota em tempo real.
 * - [ATUALIZADO] Substituição das dicas pelo card regulamentar dinâmico de vencimento de viaturas TVDE.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom'; // Importado para suporte a Portais dinâmicos no Header
import { useLocation, useNavigate } from 'react-router-dom';
// Adicionados os ícones para as frotas e alertas regulamentares
import { 
  UserCheck, Car, Building2, TrendingUp, Calendar, 
  AlertTriangle, CheckCircle2, Info, ChevronLeft, ChevronRight, ArrowRight, UserPlus,
  AlertCircle, Sparkles
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import StatCard from '../features/dashboard/StatCard';

/**
 * FUNÇÕES UTILITÁRIAS (ISO 8601)
 */

// Algoritmo standard ISO 8601 para número da semana
function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Calcula o intervalo de datas (Segunda a Domingo) de uma semana/ano
function getWeekDateRange(week, year) {
  const j4 = new Date(year, 0, 4);
  const mon1 = new Date(j4.getTime() - (j4.getDay() || 7 - 1) * 86400000);
  const monday = new Date(mon1.getTime() + (week - 1) * 7 * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const format = (d) => d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  return `${format(monday)} — ${format(sunday)}`;
}

// --- Calculado uma única vez no carregamento do módulo ---
const _hoje = new Date();
const SEMANA_ATUAL = getISOWeekNumber(_hoje);
const ANO_ATUAL = _hoje.getFullYear();

/**
 * Algoritmo de cálculo legal de tempo restante para circulação TVDE
 */
const obterDiasRestantesTVDE = (dataPrimeiraMatricula, limiteAnos = 7) => {
  if (!dataPrimeiraMatricula) return null;
  const dataMatricula = new Date(dataPrimeiraMatricula);
  const dataLimite = new Date(dataMatricula);
  dataLimite.setFullYear(dataMatricula.getFullYear() + Number(limiteAnos));
  
  const hoje = new Date();
  const diffTime = dataLimite - hoje;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Retorna dias (positivos ou negativos)
};

export default function Dashboard() {
  const navigate = useNavigate();

  // Estados de Tempo baseados nas constantes globais
  const [semanaVisivel, setSemanaVisivel] = useState(SEMANA_ATUAL);
  const [anoVisivel, setAnoVisivel] = useState(ANO_ATUAL);

  // Estados de Dados
  const [stats, setStats] = useState({
    motoristas: 0,
    veiculos: 0,
    proprietarios: 0,
    leadsTotais: 0,
    leadsNovas: 0,
    leadsContacto: 0
  });
  const [alertas, setAlertas] = useState([]);
  const [alertasTVDE, setAlertasTVDE] = useState([]); // [NOVO] Alertas regulamentares de idade das viaturas
  const [limiteAnosTVDE, setLimiteAnosTVDE] = useState(7); // [NOVO] Limite configurado via administração
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [motSnap, veiSnap, propSnap, leadsSnap, configSnap] = await Promise.all([
          getDocs(collection(db, "motoristas")),
          getDocs(collection(db, "veiculos")),
          getDocs(collection(db, "proprietarios")),
          getDocs(collection(db, "leads_captadas")),
          getDoc(doc(db, "configuracoes", "veiculos")) // [NOVO] Carrega o limite de circulação regulamentar
        ]);

        // Contabilização de estados do funil de Leads
        const todasLeads = leadsSnap.docs.map(doc => doc.data());
        const novas = todasLeads.filter(l => l.estado === 'novo').length;
        const contacto = todasLeads.filter(l => l.estado === 'contacto_iniciado').length;

        // Limite de anos configurável
        const limiteAnos = configSnap.exists() ? (configSnap.data().limiteAnosTVDE || 7) : 7;
        setLimiteAnosTVDE(limiteAnos);

        setStats({
          motoristas: motSnap.size,
          veiculos: veiSnap.size,
          proprietarios: propSnap.size,
          leadsTotais: leadsSnap.size,
          leadsNovas: novas,
          leadsContacto: contacto
        });

        let listaAlertas = [];
        const hojeCheck = new Date();

        // 1. Alertas de Validade de Motoristas
        motSnap.docs.forEach(doc => {
          const m = doc.data();
          const checks = [
            { data: m.validadeCarta, label: `Carta de ${m.nome}` },
            { data: m.validadeTVDE, label: `Certificado TVDE de ${m.nome}` }
          ];
          checks.forEach(c => {
            if (c.data) {
              const diff = Math.floor((new Date(c.data) - hojeCheck) / (1000 * 60 * 60 * 24));
              if (diff <= 30) listaAlertas.push({ 
                ...c, 
                dias: diff,
                itemId: doc.id,
                tipo: 'motorista'
              });
            }
          });
        });

        // 2. Alertas de Validade de Veículos (Seguro e IPO)
        veiSnap.docs.forEach(doc => {
          const v = doc.data();
          const checks = [
            { data: v.validadeSeguro, label: `Seguro do ${v.matricula}` },
            { data: v.validadeIPO, label: `IPO do ${v.matricula}` }
          ];
          checks.forEach(c => {
            if (c.data) {
              const diff = Math.floor((new Date(c.data) - hojeCheck) / (1000 * 60 * 60 * 24));
              if (diff <= 30) listaAlertas.push({ 
                ...c, 
                dias: diff,
                itemId: doc.id,
                tipo: 'veiculo'
              });
            }
          });
        });

        setAlertas(listaAlertas.sort((a, b) => a.dias - b.dias));

        // 3. [NOVO] Filtro regulamentar TVDE: Calcula validade máxima de circulação de frotas
        const todosVeiculos = veiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const listagemTVDE = todosVeiculos
          .map(v => {
            const dias = obterDiasRestantesTVDE(v.dataPrimeiraMatricula, limiteAnos);
            return { ...v, diasRestantes: dias };
          })
          .filter(v => v.diasRestantes !== null && v.diasRestantes <= 30)
          .sort((a, b) => a.diasRestantes - b.diasRestantes);

        setAlertasTVDE(listagemTVDE);

      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handlers de Navegação Semanal
  const handlePrevWeek = () => {
    if (semanaVisivel > 1) {
      setSemanaVisivel(semanaVisivel - 1);
    } else {
      setSemanaVisivel(SEMANA_ATUAL);
      setAnoVisivel(anoVisivel - 1);
    }
  };

  const handleNextWeek = () => {
    if (semanaVisivel < 52) {
      setSemanaVisivel(semanaVisivel + 1);
    } else {
      setSemanaVisivel(1);
      setAnoVisivel(anoVisivel + 1);
    }
  };

  const resetToToday = () => {
    setSemanaVisivel(SEMANA_ATUAL);
    setAnoVisivel(ANO_ATUAL);
  };

  // Função de Navegação por Alerta
  const handleAlertaClick = (alerta) => {
    const rota = alerta.tipo === 'motorista' ? '/motoristas' : '/veiculos';
    navigate(`${rota}?id=${alerta.itemId}`);
  };

  const isHoje = () => semanaVisivel === SEMANA_ATUAL && anoVisivel === ANO_ATUAL;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header empilhável para evitar sobreposição em ecrãs pequenos */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Painel de Controlo</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Resumo em tempo real da sua operação TVDE.</p>
        </div>

        {/* NAVEGADOR SEMANAL */}
        <div className="flex flex-col items-start sm:items-end gap-1 w-full sm:w-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center gap-0 overflow-hidden w-full sm:w-auto justify-between">
            <button 
              type="button"
              onClick={handlePrevWeek}
              className="p-2.5 px-3 hover:bg-slate-50 transition-colors text-slate-400 hover:text-tvde-primary border-r border-slate-100 active:scale-95 shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="px-4 text-center flex-1 sm:flex-initial min-w-[120px]">
              <div className="flex items-center justify-center">
                <span className="text-xs sm:text-sm font-black text-slate-800">Semana {semanaVisivel}</span>
                {isHoje() && (
                  <span className="text-[9px] font-black bg-tvde-primary text-white px-1.5 py-0.5 rounded-full ml-1 uppercase tracking-tighter shrink-0">
                    Atual
                  </span>
                )}
              </div>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 leading-none pb-1">
                {getWeekDateRange(semanaVisivel, anoVisivel)}
              </p>
            </div>

            <button 
              type="button"
              onClick={handleNextWeek}
              className="p-2.5 px-3 hover:bg-slate-50 transition-colors text-slate-400 hover:text-tvde-primary border-l border-slate-100 active:scale-95 shrink-0"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {!isHoje() && (
            <button 
              type="button"
              onClick={resetToToday}
              className="text-[10px] font-black text-tvde-primary uppercase tracking-widest hover:underline mt-1 sm:mr-2 cursor-pointer self-start sm:self-auto"
            >
              Voltar a Hoje
            </button>
          )}
        </div>
      </header>

      {/* Grid de Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="space-y-1">
          <StatCard 
            label="Motoristas" 
            value={loading ? "..." : stats.motoristas} 
            icon={UserCheck} 
            colorClass="bg-green-50 text-green-600" 
          />
          <p className="text-[10px] text-slate-300 italic px-2">Referência: Semana {semanaVisivel}/{anoVisivel}</p>
        </div>
        <div className="space-y-1">
          <StatCard 
            label="Veículos" 
            value={loading ? "..." : stats.veiculos} 
            icon={Car} 
            colorClass="bg-blue-50 text-blue-600" 
          />
          <p className="text-[10px] text-slate-300 italic px-2">Referência: Semana {semanaVisivel}/{anoVisivel}</p>
        </div>
        <div className="space-y-1">
          <StatCard 
            label="Proprietários" 
            value={loading ? "..." : stats.proprietarios} 
            icon={Building2} 
            colorClass="bg-indigo-50 text-indigo-600" 
          />
          <p className="text-[10px] text-slate-300 italic px-2">Referência: Semana {semanaVisivel}/{anoVisivel}</p>
        </div>
      </div>

      {/* Secção Inferior (3 colunas dinâmicas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* COLUNA 1: ALERTAS REAIS CLICÁVEIS */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                  <AlertTriangle className={alertas.length > 0 ? "text-orange-500 animate-pulse" : "text-slate-300"} size={20} />
                  Alertas de Validade
                </h4>
                {alertas.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-0.5 ml-7 italic">Clique para abrir o registo</p>
                )}
              </div>
              {alertas.length > 0 && (
                <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md uppercase shrink-0">
                  Atenção
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {alertas.length > 0 ? (
                alertas.map((alerta) => (
                  <button
                    key={alerta.itemId + alerta.label}
                    type="button"
                    onClick={() => handleAlertaClick(alerta)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all group cursor-pointer min-w-0 ${
                      alerta.dias < 0 
                      ? 'bg-red-50 border-red-100 hover:bg-red-100 hover:border-red-200' 
                      : 'bg-orange-50 border-orange-100 hover:bg-orange-100 hover:border-orange-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2 text-left">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${alerta.dias < 0 ? 'bg-red-500' : 'bg-orange-500'}`} />
                      <span className="text-xs sm:text-sm font-bold text-slate-700 truncate flex-1">
                        {alerta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] sm:text-xs font-black ${alerta.dias < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                        {alerta.dias < 0 ? `EXPIRADO` : `em ${alerta.dias}d`}
                      </span>
                      <ArrowRight size={13} className={`transition-transform group-hover:translate-x-1 ${
                        alerta.dias < 0 ? 'text-red-300' : 'text-orange-300'
                      }`} />
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-slate-500 font-medium">Tudo em dia!</p>
                  <p className="text-slate-400 text-xs mt-1">Nenhum documento expira em 30 dias.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA 2: FUNIL DE CAPTAÇÃO DE LEADS (CRM) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                <UserPlus className="text-indigo-600" size={20} />
                Funil de Leads (CRM)
              </h4>
              <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md uppercase shrink-0">
                Em Tempo Real
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 bg-blue-50/60 border border-blue-100/50 rounded-xl">
                <span className="text-xs font-bold text-slate-700">🆕 Novas Leads</span>
                <span className="text-sm font-black text-blue-700">{loading ? "..." : stats.leadsNovas}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-100/50 rounded-xl">
                <span className="text-xs font-bold text-slate-700">📞 Contacto Iniciado</span>
                <span className="text-sm font-black text-amber-700">{loading ? "..." : stats.leadsContacto}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold text-slate-700">📊 Total no Funil</span>
                <span className="text-sm font-black text-slate-800">{loading ? "..." : stats.leadsTotais}</span>
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => navigate('/leads')}
            className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            Ir para o CRM <ArrowRight size={13} />
          </button>
        </div>

        {/* [ATUALIZADO] COLUNA 3: ALERTAS DE FIM DE CIRCULAÇÃO TVDE (30 DIAS OU MENOS) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base select-none">
                  <AlertCircle className={alertasTVDE.length > 0 ? "text-amber-500" : "text-slate-300"} size={20} />
                  Fim de Ciclo TVDE
                </h4>
                {alertasTVDE.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-0.5 ml-7 italic select-none">Limite legal de circulação</p>
                )}
              </div>
              {alertasTVDE.length > 0 && (
                <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md uppercase shrink-0 select-none">
                  Prazo {limiteAnosTVDE}a
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[280px] pr-1.5 custom-scrollbar text-left">
              {alertasTVDE.length > 0 ? (
                alertasTVDE.map((v) => {
                  const expirado = v.diasRestantes <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => navigate(`/veiculos?id=${v.id}`)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between gap-3 transition-all group cursor-pointer text-left ${
                        expirado 
                          ? 'bg-red-50/50 border-red-100 hover:bg-red-50 hover:border-red-200' 
                          : 'bg-orange-50/50 border-orange-100 hover:bg-orange-50 hover:border-orange-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-800 text-white text-[9px] font-black px-1.5 py-0.5 rounded font-mono select-none shrink-0">
                            {v.matricula}
                          </span>
                          <span className="text-xs font-bold text-slate-700 truncate">
                            {v.marca} {v.modelo}
                          </span>
                        </div>
                        {v.dataPrimeiraMatricula && (
                          <p className="text-[9px] text-slate-400 mt-1 select-none">
                            Matrícula: {new Date(v.dataPrimeiraMatricula).toLocaleDateString('pt-PT')}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {expirado ? (
                          <span className="text-[9px] font-black uppercase text-red-600 bg-red-100/60 px-1.5 py-0.5 rounded">
                            EXPIRADO
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-100/60 px-1.5 py-0.5 rounded">
                            {v.diasRestantes}d
                          </span>
                        )}
                        <ArrowRight size={13} className={`transition-transform group-hover:translate-x-1 shrink-0 ${
                          expirado ? 'text-red-300' : 'text-orange-300'
                        }`} />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-slate-500 font-medium">Tudo em dia!</p>
                  <p className="text-slate-400 text-xs mt-1">Nenhum veículo próximo do limite regulamentar.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}