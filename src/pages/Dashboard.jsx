import React, { useState, useEffect } from 'react';
import { 
  UserCheck, Car, Building2, TrendingUp, Calendar, 
  AlertTriangle, CheckCircle2, Info, ChevronLeft, ChevronRight, ArrowRight, UserPlus 
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
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
    // Métricas do card de Leads
    leadsTotais: 0,
    leadsNovas: 0,
    leadsContacto: 0
  });
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [motSnap, veiSnap, propSnap, leadsSnap] = await Promise.all([
          getDocs(collection(db, "motoristas")),
          getDocs(collection(db, "veiculos")),
          getDocs(collection(db, "proprietarios")),
          getDocs(collection(db, "leads_captadas")) // Consulta integrada de Leads
        ]);

        // Contabilização de estados do funil de Leads
        const todasLeads = leadsSnap.docs.map(doc => doc.data());
        const novas = todasLeads.filter(l => l.estado === 'novo').length;
        const contacto = todasLeads.filter(l => l.estado === 'contacto_iniciado').length;

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

        // 1. Alertas de Motoristas
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

        // 2. Alertas de Veículos
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

  const isHoje = javaScriptCheck => semanaVisivel === SEMANA_ATUAL && anoVisivel === ANO_ATUAL;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ◄ ALTERADO: Header empilhável para evitar sobreposição em ecrãs pequenos */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Painel de Controlo</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Resumo em tempo real da sua operação TVDE.</p>
        </div>

        {/* NAVEGADOR SEMANAL (Agora flui corretamente abaixo do título no telemóvel) */}
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

      {/* Grid de Estatísticas Gerais (Gap dinâmico para poupar espaço em mobile) */}
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
                    {/* ◄ ALTERADO: Truncagem flexível inteligente para qualquer tamanho de tela */}
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

        {/* COLUNA 3: DICAS DE GESTÃO */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Info size={20} className="text-tvde-primary" />
              Dicas de Gestão
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm font-bold text-slate-700 leading-tight">Mantenha os PINs seguros</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Pode consultar os PINs dos cartões de combustível rapidamente na secção de Cartões em Registos.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm font-bold text-slate-700 leading-tight">Documentação Digital</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Ao carregar o DUA e o Seguro no sistema, evita ter de procurar pastas físicas em caso de fiscalização.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}