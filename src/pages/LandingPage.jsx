/**
 * LandingPage.jsx
 * Localização: src/pages/LandingPage.jsx
 *
 * Página inicial pública consolidada (Ficheiro Único Monolítico).
 * Otimizada com tipografia fluida, espaçamentos responsivos e suporte mobile completo.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, Check, ArrowRight, Loader2, BookOpen, 
  Car, HelpCircle, FileText, Smartphone, Mail, User,
  CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Sparkles 
} from 'lucide-react';
import ReactGA from 'react-ga4';
import { registarLeadPública } from '../services/leadService';
import { formatCurrency } from '../utils/formatters';

// Importação do catálogo público de frotas
import VehicleCatalog from '../components/public/VehicleCatalog';

export default function LandingPage() {
  const navigate = useNavigate();

  // ─── ESTADOS DOS FORMULÁRIOS E ABAS ───────────────────────────────────────
  
  // Controlo das abas de Nossos Serviços
  const [abaServicos, setAbaServicos] = useState('motoristas'); // 'motoristas' | 'proprietarios'

  // Isca Digital (eGuia Onboarding - Apenas Nome e Telemóvel)
  const [leadGuia, setLeadGuia] = useState({ nome: '', telemovel: '' });
  const [loadingGuia, setLoadingGuia] = useState(false);
  const [feedbackGuia, setFeedbackGuia] = useState(null);

  // Procura de Viatura
  const [leadCarro, setLeadCarro] = useState({ nome: '', email: '', telemovel: '', regiao: 'Lisboa', mensagem: '' });
  const [loadingCarro, setLoadingCarro] = useState(false);
  const [feedbackCarro, setFeedbackCarro] = useState(null);

  // Acordeão de FAQs
  const [faqAtiva, setFaqAtiva] = useState(null);

  // ─── ESCUTADOR DE SELEÇÃO DE VIATURAS DO CATÁLOGO ────────────────────────
  useEffect(() => {
    const lidarComSelecaoVeiculo = (e) => {
      const modeloPretendido = e.detail;
      if (modeloPretendido) {
        setLeadCarro(prev => ({
          ...prev,
          mensagem: `Gostaria de solicitar informações de aluguer para a viatura selecionada no vosso catálogo: ${modeloPretendido}`
        }));
      }
    };

    window.addEventListener('selecionarVeiculoCatalogo', lidarComSelecaoVeiculo);
    return () => {
      window.removeEventListener('selecionarVeiculoCatalogo', lidarComSelecaoVeiculo);
    };
  }, []);

  // ─── LISTAGEM DE FAQS ─────────────────────────────────────────────────────
  const listaFaqs = [
    {
      id: 1,
      pergunta: "Como funciona o vosso apoio na etapa de formação?",
      resposta: "Nós não somos uma escola de condução ou entidade formadora, atuamos como assessores de apoio documental. Analisamos o seu perfil, encaminhamos para as melhores escolas certificadas parceiras na sua região com as taxas de aprovação mais consistentes, e ajudamos a articular toda a documentação de pré-inscrição."
    },
    {
      id: 2,
      pergunta: "Que apoio prestam para providenciar os documentos obrigatórios?",
      resposta: "Orientamos detalhadamente sobre como obter o registo criminal limpo focado em TVDE, ajudamos no agendamento rápido dos exames médicos exigidos e da avaliação psicotécnica de Grupo 2 em clínicas parceiras, assegurando que nenhum documento seja submetido com erros ou fora do prazo legal."
    },
    {
      id: 3,
      pergunta: "O que fazem na organização de documentos nos órgãos governamentais (IMT)?",
      resposta: "Garantimos a organização estruturada de todo o seu dossiê de candidatura e tratamos de todo o processo de submissão do pedido de certificado de motorista diretamente junto do portal oficial do IMT online, acompanhando quaisquer exigências e garantindo a correta atribuição de taxas."
    },
    {
      id: 4,
      pergunta: "Como funciona o apoio na criação de contas e instrução das aplicações?",
      resposta: "Apoiamos na criação correta do seu perfil profissional de motorista nas aplicações Uber e Bolt. Adicionalmente, prestamos sessões de instrução prática detalhada sobre como operar as aplicações de motorista, como aceitar viagens, gerir tarifas, ler mapas térmicos e maximizar a produtividade na estrada."
    },
    {
      id: 5,
      pergunta: "Posso trabalhar por conta própria nas plataformas sem um Operador?",
      resposta: "Não diretamente. Em Portugal, a Uber e a Bolt exigem que o motorista esteja vinculado a uma empresa licenciada com frota (um Operador TVDE). Como assessoria, ajudamos a selecionar e a vinculá-lo de forma segura a operadores idóneos com frotas em conformidade legal."
    }
  ];

  // Submissão de Acesso ao eGuia Onboarding
  const handleSubmeterGuia = async (e) => {
    e.preventDefault();
    setLoadingGuia(true);
    setFeedbackGuia(null);

    try {
      const res = await registarLeadPública({
        nome: leadGuia.nome,
        email: '', // O email não é solicitado neste formulário
        telemovel: leadGuia.telemovel,
        origem: 'eguia_onboarding',
        mensagemAdicional: 'Solicitou acesso imediato ao eGuia de Onboarding TVDE.'
      });

      if (res.sucesso) {
        // Disparo de Evento de Conversão no Google Analytics 4
        ReactGA.event({
          category: 'Lead Generation',
          action: 'Submissao_eGuia_TVDE',
          label: 'Campanha Organica - Landing Page',
          value: 1
        });

        // Limpeza dos campos
        setLeadGuia({ nome: '', telemovel: '' });
        
        // Redirecionamento seguro passando estado de autorização para o Router
        navigate('/guia-onboarding', { state: { authorized: true } });
      } else {
        setFeedbackGuia(res);
      }
    } catch (err) {
      console.error(err);
      setFeedbackGuia({ sucesso: false, msg: "Erro técnico de rede. Tente de novo." });
    } finally {
      setLoadingGuia(false);
    }
  };

  // Submissão de Procura de Carro
  const handleSubmeterCarro = async (e) => {
    e.preventDefault();
    setLoadingCarro(true);
    setFeedbackCarro(null);

    try {
      const res = await registarLeadPública({
        nome: leadCarro.nome,
        email: leadCarro.email,
        telemovel: leadCarro.telemovel,
        origem: 'procura_viatura',
        mensagemAdicional: `Procura carro em: ${leadCarro.regiao}. Mensagem: ${leadCarro.mensagem}`
      });

      setFeedbackCarro(res);
      if (res.sucesso) {
        setLeadCarro({ nome: '', email: '', telemovel: '', regiao: 'Lisboa', mensagem: '' });
      }
    } catch (err) {
      console.error(err);
      setFeedbackCarro({ sucesso: false, msg: "Erro técnico de rede. Tente de novo." });
    } finally {
      setLoadingCarro(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans scroll-smooth">
      
      {/* ─── 1. BARRA DE NAVEGAÇÃO SUPERIOR RESPONSIVA ────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-slate-900">Gestão</span>
            <span className="text-xl font-black text-blue-600">TVDE</span>
          </div>
          
          {/* Oculto em ecrãs pequenos (Mobile) */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-semibold text-slate-600">
            <a href="#servicos" className="hover:text-blue-600 transition-colors">Nossos Serviços</a>
            <a href="#planos" className="hover:text-blue-600 transition-colors">Planos de Assessoria</a>
            <a href="#catalogo" className="hover:text-blue-600 transition-colors">Catálogo de Viaturas</a>
            <a href="#aluguer" className="hover:text-blue-600 transition-colors">Aluguer de Viaturas</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">Dúvidas Comuns</a>
          </div>

          <div>
            <a 
              href="/login" 
              className="px-3.5 sm:px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xs"
            >
              Área de Clientes
            </a>
          </div>
        </div>
      </nav>

      {/* 🚀 FAIXA GLOBAL DE "NOVIDADE" RESPONSIVA */}
      <div className="bg-blue-600 text-white text-center py-2.5 px-4 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-2 shadow-xs shrink-0 select-none">
        <Sparkles size={12} className="animate-pulse shrink-0" />
        <span>O nosso eGuia oficial para novos motoristas TVDE em Portugal já está disponível. Aceda grátis!</span>
      </div>

      {/* ─── 2. SECÇÃO HERO (RESPONSIVA) ─────────────────────────────────────── */}
      <header className="relative py-12 md:py-24 px-4 sm:px-6 bg-slate-950 text-white overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Lado Esquerdo: Valor de Marca */}
          <div className="lg:col-span-7 space-y-5 md:space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] sm:text-xs font-semibold">
              <Shield size={12} />
              Assessoria de Apoio Documental & Plataformas
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight">
              Apoio e Assessoria especializada para Motoristas TVDE
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed max-w-xl">
              Apoiamos em todas as etapas regulatórias em Portugal: apoio na etapa de formação homologada, orientação para providenciar documentos obrigatórios (exames e psicotécnicos de Grupo 2), organização de documentos junto do IMT, criação de contas e instrução prática das aplicações Uber e Bolt.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 text-[11px] sm:text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} />
                <span>Apoio na Etapa de Formação</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} />
                <span>Organização Governamental (IMT)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} />
                <span>Criação de Contas & Instrução</span>
              </div>
            </div>
          </div>

          {/* Lado Direito: Formulário Exclusivo de Captura do eGuia */}
          <div className="lg:col-span-5 bg-white text-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 max-w-md mx-auto w-full">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-blue-600">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Acesso Imediato Gratuito</span>
                </div>
                <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Disponível
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">📖 eGuia Novo Motorista TVDE</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Descubra o caminho estratégico da decisão à sua primeira viagem. Introduza os dados abaixo para aceder imediatamente ao guia completo online e realizar o download em PDF.
              </p>

              <form onSubmit={handleSubmeterGuia} className="space-y-3.5 text-left">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    required 
                    placeholder="O seu nome completo"
                    value={leadGuia.nome}
                    onChange={e => setLeadGuia({ ...leadGuia, nome: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="tel" 
                    required 
                    placeholder="Telemóvel (ex: +351 912 345 678)"
                    value={leadGuia.telemovel}
                    onChange={e => setLeadGuia({ ...leadGuia, telemovel: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loadingGuia}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 cursor-pointer animate-pulse"
                >
                  {loadingGuia ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ArrowRight size={14} />
                  )}
                  Desbloquear Acesso ao eGuia
                </button>
              </form>

              {feedbackGuia && (
                <div className="flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2.5 border bg-red-50 text-red-700 border-red-100">
                  <AlertCircle size={14} />
                  <span className="leading-relaxed">{feedbackGuia.msg}</span>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* ─── 3. SECÇÃO NOSSOS SERVIÇOS [NOVO / ATUALIZADO] ───────────────────── */}
      <section id="servicos" className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">Nossos Serviços</h2>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Soluções completas desenhadas para apoiar tanto quem conduz profissionalmente como quem gere frotas parceiras em Portugal [1].
          </p>
        </div>

        {/* Seletor de Abas de Serviços */}
        <div className="flex justify-center gap-3 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto select-none shrink-0">
          <button
            type="button"
            onClick={() => setAbaServicos('motoristas')}
            className={`px-5 sm:px-6 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              abaServicos === 'motoristas' 
                ? 'bg-slate-950 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🙋‍♂️ Para Motoristas
          </button>
          <button
            type="button"
            onClick={() => setAbaServicos('proprietarios')}
            className={`px-5 sm:px-6 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              abaServicos === 'proprietarios' 
                ? 'bg-slate-950 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🏢 Para Proprietários
          </button>
        </div>

        {/* Conteúdo Aba A: Motoristas */}
        {abaServicos === 'motoristas' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 text-center space-y-6 max-w-3xl mx-auto relative overflow-hidden animate-in fade-in duration-300">
            <div className="absolute top-4 right-4 bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shrink-0">
              Em Breve
            </div>
            <div className="max-w-md mx-auto space-y-4">
              <BookOpen size={40} className="text-blue-600 mx-auto" />
              <h3 className="text-xl font-black text-slate-900">Área Dedicada ao Motorista</h3>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed text-center">
                Estamos a estruturar um portal de apoio onde poderá submeter faturas semanais de combustível, gerir despesas operacionais de portagens, acompanhar quitações e depósitos de caução parametrizados como crédito, e aceder a relatórios automatizados.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-500">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping shrink-0"></span>
                Fase de modelagem técnica e regulatória
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo Aba B: Proprietários */}
        {abaServicos === 'proprietarios' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 text-center space-y-6 max-w-3xl mx-auto relative overflow-hidden animate-in fade-in duration-300">
            <div className="absolute top-4 right-4 bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shrink-0">
              Em Breve
            </div>
            <div className="max-w-md mx-auto space-y-4">
              <Car size={40} className="text-indigo-600 mx-auto" />
              <h3 className="text-xl font-black text-slate-900">Portal de Gestão de Frotas (Operadores)</h3>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed text-center">
                Um painel administrativo para proprietários de frotas parceiras acompanharem a rentabilidade operacional, controlo técnico de manutenção, processamentos financeiros semanais e atribuição automática de cartões de abastecimento e Via Verde.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-500">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping shrink-0"></span>
                Fase de modelagem técnica e regulatória
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── 4. SECÇÃO PLANOS DE ASSESSORIA (RESPONSIVA) ────────────────────── */}
      <section id="planos" className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto space-y-10 md:space-y-12 border-t border-slate-200">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">Pacotes de Apoio à sua medida</h2>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Escolha o nível de assessoria e acompanhamento ideal para estruturar a sua formação, organizar documentos no IMT e ativar as suas contas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Pacote Básico / Essencial */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow select-none">
            <div className="space-y-4 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Plano Essencial</span>
              <h3 className="text-xl font-black text-slate-900">Apoio Documental</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Orientação para providenciar toda a documentação obrigatória inicial (exames, psicos e registo criminal) e apoio prévio na escolha da entidade formadora.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Apoio na escolha de Escolas TVDE</li>
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Orientação para Psicotécnicos</li>
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Guia de instrução para as aplicações</li>
              </ul>
            </div>
            <div className="text-left relative mt-auto pt-4 border-t border-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Investimento único</p>
              <p className="text-2xl font-black text-slate-900 filter blur-[5px] select-none">{formatCurrency(49.00)}</p>
              <span className="text-[10px] font-bold text-blue-600 block mt-1">Preço disponível em breve</span>
            </div>
          </div>

          {/* Pacote Recomendado */}
          <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-6 relative shadow-sm select-none">
            <span className="absolute top-0 right-6 -translate-y-1/2 bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
              Mais Solicitado
            </span>
            <div className="space-y-4 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Plano Avançado</span>
              <h3 className="text-xl font-black text-slate-900">Organização IMT</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Apoio especializado na organização completa do dossiê de candidatura e submissão eletrónica de documentos junto do IMT para emissão do certificado.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Apoio para providenciar exames de Grupo 2</li>
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Organização de ficheiros e submissão no IMT</li>
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Instrução de averbamento do código 997</li>
              </ul>
            </div>
            <div className="text-left relative mt-auto pt-4 border-t border-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Investimento único</p>
              <p className="text-2xl font-black text-blue-600 filter blur-[5px] select-none">{formatCurrency(149.00)}</p>
              <span className="text-[10px] font-bold text-blue-600 block mt-1">Preço disponível em breve</span>
            </div>
          </div>

          {/* Pacote Chave na Mão */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow select-none">
            <div className="space-y-4 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Plano Premium</span>
              <h3 className="text-xl font-black text-slate-900">Ativação & Instrução</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Acompanhamento completo de ponta a ponta: apoio na etapa de formação, submissão ao IMT, criação e ativação de contas e instrução sobre o funcionamento das aplicações.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Todo o apoio documental e IMT incluído</li>
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Apoio na criação de contas Uber e Bolt</li>
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Instrução prático do funcionamento das aplicações</li>
              </ul>
            </div>
            <div className="text-left relative mt-auto pt-4 border-t border-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Investimento único</p>
              <p className="text-2xl font-black text-slate-900 filter blur-[5px] select-none">{formatCurrency(249.00)}</p>
              <span className="text-[10px] font-bold text-blue-600 block mt-1">Preço disponível em breve</span>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 5. CATÁLOGO INTERATIVO DE VIATURAS (RESPONSIVO) ───────────────── */}
      <VehicleCatalog />

      {/* ─── 6. SECÇÃO DE PROCURA DE VIATURAS (MATCHING DE ALUGUER) ───────────── */}
      <section id="aluguer" className="bg-slate-900 text-white py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <Car size={12} />
              Frota de Viaturas TVDE Disponível
            </div>
            <h2 className="text-2xl md:text-3xl font-black leading-tight">Procura uma viatura para trabalhar?</h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
              Asseguramos contacto com operadores licenciados que disponibilizam viaturas em conformidade regulatória nas plataformas, equipadas com seguros TVDE específicos (responsabilidade civil e passageiros), Via Verde e cartões de desconto de combustível.
            </p>
            <div className="space-y-3 text-xs font-semibold text-slate-200">
              <p className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Manutenção e Oficina a cargo do Operador parceiro</p>
              <p className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Cobertura total de Seguros de Passageiros e Ocupantes</p>
              <p className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Modelos económicos e elétricos de alta autonomia</p>
            </div>
          </div>

          {/* Cartão de Encontrar Viatura */}
          <div className="lg:col-span-6 bg-white text-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl max-w-md mx-auto w-full">
            <h4 className="text-lg font-black text-slate-900">Encontrar Viatura Disponível</h4>
            <p className="text-slate-400 text-xs mt-1 mb-4 leading-relaxed">
              Diga-nos em que zona do país pretende trabalhar para encontrarmos as melhores viaturas de operadores parceiros disponíveis na sua região.
            </p>

            <form onSubmit={handleSubmeterCarro} className="space-y-3.5 text-left">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" required placeholder="Nome completo"
                  value={leadCarro.nome}
                  onChange={e => setLeadCarro({ ...leadCarro, nome: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="tel" required placeholder="Telemóvel"
                    value={leadCarro.telemovel}
                    onChange={e => setLeadCarro({ ...leadCarro, telemovel: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <select 
                    value={leadCarro.regiao}
                    onChange={e => setLeadCarro({ ...leadCarro, regiao: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Lisboa">Grande Lisboa</option>
                    <option value="Porto">Grande Porto</option>
                    <option value="Braga">Braga / Minho</option>
                    <option value="Algarve">Algarve</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="email" required placeholder="Endereço de email"
                  value={leadCarro.email}
                  onChange={e => setLeadCarro({ ...leadCarro, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <textarea 
                placeholder="Observações ou preferência de modelo (ex: Renault Leaf, Zoe, Dacia Jogger)..."
                value={leadCarro.mensagem}
                onChange={e => setLeadCarro({ ...leadCarro, mensagem: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-16 resize-none"
              />

              <button 
                type="submit"
                disabled={loadingCarro}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 cursor-pointer"
              >
                {loadingCarro ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Car size={14} />
                )}
                Solicitar Viatura de Aluguer
              </button>
            </form>

            {feedbackCarro && (
              <div className={`mt-4 flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2 border ${
                feedbackCarro.sucesso 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : 'bg-red-50 text-red-700 border-red-100'
              }`}>
                {feedbackCarro.sucesso ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {feedbackCarro.msg}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ─── 7. SECÇÃO DE PERGUNTAS E RESPOSTAS COMUNS (FAQ ACCORDION) ───────── */}
      <section id="faq" className="py-16 md:py-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <HelpCircle size={32} className="text-blue-600 mx-auto" />
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">Perguntas Frequentes (FAQ)</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Tudo o que precisa de saber sobre as regras de acesso ao mercado TVDE português.</p>
        </div>

        <div className="space-y-3.5 text-left max-w-3xl mx-auto">
          {listaFaqs.map((faq) => {
            const estaAberta = faqAtiva === faq.id;
            
            return (
              <div 
                key={faq.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setFaqAtiva(estaAberta ? null : faq.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left font-bold text-slate-800 text-xs sm:text-sm hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <span>{faq.pergunta}</span>
                  {estaAberta ? (
                    <ChevronUp size={16} className="text-blue-600 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400 shrink-0" />
                  )}
                </button>

                {estaAberta && (
                  <div className="px-5 pb-5 pt-1 text-slate-500 text-xs sm:text-sm leading-relaxed border-t border-slate-100/50 animate-in slide-in-from-top-2 duration-200">
                    {faq.resposta}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 8. RODAPÉ INSTITUCIONAL (RESPONSIVO) ───────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 border-t border-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-center md:text-left">
          <div>
            <p className="font-bold text-slate-200 text-sm">Gestão TVDE Portugal, Lda.</p>
            <p className="mt-1 text-slate-500">Avenida da Liberdade 100, 1250-145 Lisboa</p>
            <p className="text-slate-600">geral@gestaotvde.pt - NIF: 500123456</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-slate-500 font-medium items-center">
            <a href="/login" className="hover:text-white transition-colors">Área Restrita (ERP)</a>
            <span className="text-slate-800 hidden sm:inline">|</span>
            <span>&copy; {new Date().getFullYear()} Gestão TVDE. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}