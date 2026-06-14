/**
 * LandingPage.jsx
 * Localização: src/pages/LandingPage.jsx
 *
 * Página inicial pública consolidada (Ficheiro Único Monolítico).
 * Otimizada com carrossel dinâmico de texto à esquerda, formulário eGuia fixo à direita,
 * catálogo de viaturas, destaques de blog, planos de assessoria interativos e IA.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, Check, ArrowRight, Loader2, BookOpen, 
  Car, HelpCircle, Smartphone, Mail, User,
  CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Sparkles, Clock,
  ChevronRight, ChevronLeft, Printer 
} from 'lucide-react';
import ReactGA from 'react-ga4';
import { registarLeadPública } from '../services/leadService';
import { formatCurrency } from '../utils/formatters';

// Importações do catálogo público de frotas e do assistente virtual de IA 24/7
import PublicChatWidget from '../components/public/PublicChatWidget';
import NavbarLanding from '../components/public/NavbarLanding';
import CatalogoViaturas from '../components/public/CatalogoViaturas';

export default function LandingPage() {
  const navigate = useNavigate();

  // ─── ESTADOS DOS FORMULÁRIOS E CARROSSEL ──────────────────────────────────
  
  // Controlo do Carrossel de Texto à Esquerda (Hero)
  const [slideTexto, setSlideAtivo] = useState(0);
  const totalSlides = 3;

  // Controlo das abas de Nossos Serviços (Abaixo no corpo)
  const [abaServicos, setAbaServicos] = useState('motoristas'); // 'motoristas' | 'proprietarios'

  // Isca Digital (eGuia Onboarding - Apenas Nome e Telemóvel) - FIXO À DIREITA
  const [leadGuia, setLeadGuia] = useState({ nome: '', telemovel: '' });
  const [loadingGuia, setLoadingGuia] = useState(false);
  const [feedbackGuia, setFeedbackGuia] = useState(null);

  // Procura de Viatura (Formulário do Meio)
  const [leadCarro, setLeadCarro] = useState({ nome: '', email: '', telemovel: '', regiao: 'Lisboa', mensagem: '' });
  const [loadingCarro, setLoadingCarro] = useState(false);
  const [feedbackCarro, setFeedbackCarro] = useState(null);

  // Acordeão de FAQs
  const [faqAtiva, setFaqAtiva] = useState(null);

  // ─── LÓGICA DE ROTAÇÃO AUTOMÁTICA DO TEXTO (ESQUERDA) ──────────────────────
  useEffect(() => {
    const temporizador = setInterval(() => {
      setSlideAtivo((prev) => (prev + 1) % totalSlides);
    }, 5000); // Rotação do carrossel esquerdo a cada 5 segundos
    return () => clearInterval(temporizador);
  }, []);

  const handleProximoSlide = () => setSlideAtivo((prev) => (prev + 1) % totalSlides);
  const handleSlideAnterior = () => setSlideAtivo((prev) => (prev - 1 + totalSlides) % totalSlides);

  // ◄ ADICIONADO: Handler para seleção de Plano de Assessoria com rastreio de conversão e scroll suave
  const handleEscolherPlano = (planoNome) => {
    setLeadCarro(prev => ({
      ...prev,
      mensagem: `Gostaria de obter informações detalhadas para aderir ao vosso Plano de Assessoria TVDE: ${planoNome}.`
    }));

    // Envia evento dinâmico de clique para sabermos quais os pacotes com mais cliques
    ReactGA.event({
      category: 'Lead Generation',
      action: 'Click_Plano_Assessoria',
      label: planoNome
    });

    // Desliza suavemente até à secção do formulário
    const seccaoForm = document.getElementById('aluguer');
    if (seccaoForm) {
      seccaoForm.scrollIntoView({ behavior: 'smooth' });
    }
  };

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

  // Submissão de Acesso ao eGuia Onboarding (Formulário Fixo da Direita)
  const handleSubmeterGuia = async (e) => {
    e.preventDefault();
    setLoadingGuia(true);
    setFeedbackGuia(null);

    try {
      const res = await registarLeadPública({
        nome: leadGuia.nome,
        email: '', 
        telemovel: leadGuia.telemovel,
        origem: 'eguia_onboarding',
        mensagemAdicional: 'Solicitou acesso imediato ao eGuia de Onboarding TVDE.'
      });

      if (res.sucesso) {
        ReactGA.event({
          category: 'Lead Generation',
          action: 'Submissao_eGuia_TVDE',
          label: 'Campanha Organica - Landing Page',
          value: 1
        });

        setLeadGuia({ nome: '', telemovel: '' });
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

  // Submissão de Procura de Carro (Formulário do Meio)
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
        mensagemAdicional: `Procura carro em: ${leadCarro.regiao}. Em: ${leadCarro.mensagem}`
      });

      setFeedbackCarro(res);
      if (res.sucesso) {
        // ◄ CORRIGIDO: Propriedade corrigida de "text" para "mensagem" para limpar a textarea de forma consistente
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
      
      <NavbarLanding />

      {/* 🚀 FAIXA GLOBAL DE "NOVIDADE" RESPONSIVA */}
      <div className="bg-blue-600 text-white text-center py-2.5 px-4 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-2 shadow-xs shrink-0 select-none">
        <Sparkles size={12} className="animate-pulse shrink-0" />
        <span>O nosso eGuia oficial para novos motoristas TVDE em Portugal já está disponível. Aceda grátis!</span>
      </div>

      {/* ─── 2. SECÇÃO HERO (RESPONSIVA) ─────────────────────────────────────── */}
      <header className="relative py-12 md:py-24 px-4 sm:px-6 bg-slate-950 text-white overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LADO ESQUERDO: Carrossel de Texto Rotativo (Sem card, raw text) com Altura Mínima Responsiva */}
          <div className="lg:col-span-7 space-y-6 text-left min-h-[440px] sm:min-h-[380px] lg:min-h-[360px] flex flex-col justify-between">
            
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              
              {/* SLIDE 0: Assessoria Geral */}
              {slideTexto === 0 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] sm:text-xs font-semibold">
                    <Shield size={12} />
                    Assessoria de Apoio Documental & Plataformas
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight">
                    Apoio e Assessoria especializada para Motoristas TVDE
                  </h1>
                  <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-xl">
                    Apoiamos em todas as etapas regulatórias em Portugal: apoio na etapa de formação homologada, orientação para providenciar documentos obrigatórios (exames e psicotécnicos de Grupo 2), organização de documentos junto do IMT, criação de contas e instrução prática das aplicações Uber e Bolt.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 pt-1 text-[11px] sm:text-xs font-semibold text-slate-200">
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
              )}

              {/* SLIDE 1: Gerador de Dístico Gratuito */}
              {slideTexto === 1 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-xs font-semibold">
                    <Printer size={12} />
                    Ferramenta Gratuita ao Motorista
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight text-white">
                    Gere e Imprima o seu Dístico TVDE Grátis
                  </h1>
                  <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-xl">
                    Precisa de colocar as placas regulamentares na sua viatura? Insira a sua licença de operador e obtenha um ficheiro PDF A4 pronto a imprimir à escala real exata (145x68mm) com as marcas de corte oficiais do IMT [2].
                  </p>
                  
                  <div className="flex flex-wrap gap-4 pt-1">
                    <Link 
                      to="/gerador-distico"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer uppercase tracking-wider animate-bounce"
                    >
                      <Printer size={14} />
                      Imprima Agora
                    </Link>
                  </div>
                </div>
              )}

              {/* SLIDE 2: Catálogo de Frota */}
              {slideTexto === 2 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] sm:text-xs font-semibold">
                    <Car size={12} />
                    Catálogo de Frota de Parceiros
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight text-white">
                    Aluguer de Viaturas TVDE Prontas a Faturar
                  </h1>
                  <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-xl">
                    Encontre o veículo ideal para os seus turnos de condução. Disponibilizamos modelos económicos, a GPL, híbridos ou elétricos, com seguros de passageiros incluídos, Via Verde e cartões de abastecimento.
                  </p>
                  
                  <div className="flex flex-wrap gap-4 pt-1">
                    <button 
                      type="button"
                      onClick={() => {
                        const seccaoCatalogo = document.getElementById('catalogo');
                        if (seccaoCatalogo) seccaoCatalogo.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer uppercase tracking-wider"
                    >
                      <Car size={14} />
                      Ver Viaturas
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* CONTROLOS DO CARROSSEL DE TEXTO (DOTS E SETAS DISCRETAS) */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-900/60 select-none text-slate-500 shrink-0">
              <button 
                type="button"
                onClick={handleSlideAnterior}
                className="p-1 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex gap-1.5">
                {[...Array(totalSlides)].map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSlideAtivo(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      slideTexto === idx ? 'w-4 bg-white' : 'w-1.5 bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              <button 
                type="button"
                onClick={handleProximoSlide}
                className="p-1 rounded-lg hover:bg-slate-950 text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>

          </div>

          {/* LADO DIREITO: Form do eGuia Totalmente FIXO e Estático (Captação de leads direta) */}
          <div className="lg:col-span-5 bg-white text-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 max-w-md mx-auto w-full relative min-h-[420px] flex flex-col justify-between">
            
            <div className="space-y-4 text-left">
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
                  <span className="leading-relaxed text-[11px]">{feedbackGuia.msg}</span>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* ─── 3. SECÇÃO NOSSOS SERVIÇOS ───────────────────────────────────────── */}
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
              <h3 className="text-xl font-black text-slate-900">Area Dedicada ao Motorista</h3>
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

      {/* ─── 4. SECÇÃO PLANOS DE ASSESSORIA (RESPONSIVA) [CORRIGIDO: UNBLURRED & INTERATIVO] ────────────────────── */}
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
                Orientação para providenciar toda a documentação obrigatória inicial (exames, psicos e registo criminal) e apoio prévia na escolha da entidade formadora.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Apoio na escolha de Escolas TVDE</li>
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Orientação para Psicotécnicos</li>
                <li className="flex items-center gap-2"><Check className="text-blue-500 shrink-0" size={14} /> Guia de instrução para as aplicações</li>
              </ul>
            </div>
            <div className="text-left relative mt-auto pt-4 border-t border-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Investimento único</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(49.00)}</p>
              
              <button
                type="button"
                onClick={() => handleEscolherPlano('Plano Essencial / Apoio Documental')}
                className="w-full mt-3 py-2 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tenho Interesse
              </button>
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
              <p className="text-2xl font-black text-blue-600">{formatCurrency(149.00)}</p>

              <button
                type="button"
                onClick={() => handleEscolherPlano('Plano Avançado / Organização IMT')}
                className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tenho Interesse
              </button>
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
              <p className="text-2xl font-black text-slate-900">{formatCurrency(249.00)}</p>

              <button
                type="button"
                onClick={() => handleEscolherPlano('Plano Premium / Chave na Mão')}
                className="w-full mt-3 py-2 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tenho Interesse
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 5. CATÁLOGO INTERATIVO DE VIATURAS COM CARROSSEL (RESPONSIVO) ──── */}
      <CatalogoViaturas />

      {/* ─── 6. SECÇÃO DE PROCURA DE VIATURAS (MATCHING DE ALUGUER) ───────────── */}
      <section id="aluguer" className="bg-slate-900 text-white py-16 md:py-20 px-4 sm:px-6 border-t border-slate-800">
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

      {/* ─── 7. SECÇÃO DE DESTAQUES DO BLOG (SEO & CAPTAÇÃO DE LEADS) ──── */}
      <section id="blog-destaques" className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto space-y-10 border-t border-slate-200">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 justify-center text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <BookOpen size={14} />
            Dicas & Legislação TVDE
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">
            Mantenha-se informado sobre as regras do setor
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Esclareça as dúvidas mais comuns sobre CAE, contabilidade, dísticos obrigatórios e processos de regularização junto do IMT [2, 3].
          </p>
        </div>

        {/* Artigos em Destaque (Grelha Horizontal) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="p-5 space-y-3">
              <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md">
                Fiscalidade
              </span>
              <h3 className="text-sm font-black text-slate-900 leading-snug">
                Qual o CAE correto para TVDE e como funciona a Isenção de IVA (Artigo 53.º)?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                Descubra qual o CAE correto e como funciona a isenção de IVA para motoristas em nome próprio [1, 2].
              </p>
            </div>
            <div className="p-5 border-t border-slate-50 flex justify-between items-center text-xs">
              <span className="flex items-center gap-1 font-bold text-slate-400"><Clock size={12} /> 5 min</span>
              <Link to="/blog/cae-correto-tvde-isencao-iva-artigo-53" className="font-black text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
                Ler Artigo <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="p-5 space-y-3">
              <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md">
                Requisitos IMT
              </span>
              <h3 className="text-sm font-black text-slate-900 leading-snug">
                Como obter o Certificado de Motorista TVDE e averbar o Código 997?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                O passo a passo com exames Grupo 2, curso homologado de 125h e submissão burocrática no IMT [2].
              </p>
            </div>
            <div className="p-5 border-t border-slate-50 flex justify-between items-center text-xs">
              <span className="flex items-center gap-1 font-bold text-slate-400"><Clock size={12} /> 6 min</span>
              <Link to="/blog/requisitos-licenca-imt-codigo-997" className="font-black text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
                Ler Artigo <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between md:col-span-2 lg:col-span-1">
            <div className="p-5 space-y-3">
              <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md">
                Migrações & AIMA
              </span>
              <h3 className="text-sm font-black text-slate-900 leading-snug">
                AIMA e TVDE: Como gerir os atrasos documentais de residência para o IMT?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                Saiba quais os documentos de residência e manifestação de interesse aceites na emissão do certificado [2].
              </p>
            </div>
            <div className="p-5 border-t border-slate-50 flex justify-between items-center text-xs">
              <span className="flex items-center gap-1 font-bold text-slate-400"><Clock size={12} /> 5 min</span>
              <Link to="/blog/aima-atrasos-documentais-motoristas-tvde" className="font-black text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
                Ler Artigo <ChevronRight size={14} />
              </Link>
            </div>
          </div>

        </div>

        {/* Botão para ir para o índice do Blog */}
        <div className="pt-4">
          <Link 
            to="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer"
          >
            Aceder ao Blog Completo <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ─── 8. SECÇÃO DE PERGUNTAS E RESPOSTAS COMUNS (FAQ ACCORDION) ───────── */}
      <section id="faq" className="py-16 md:py-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-12 border-t border-slate-200">
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

      {/* ─── 9. RODAPÉ INSTITUCIONAL (RESPONSIVO) ───────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 border-t border-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-center md:text-left">
          <div>
            <p className="font-bold text-slate-200 text-sm">Gestão TVDE Portugal, Lda.</p>
            <p className="mt-1 text-slate-500">Avenida da Liberdade 100, 1250-145 Lisboa</p>
            <p className="text-slate-600">geral@gestaotvde.pt - NIF: 500123456</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-slate-500 font-medium items-center">
            <Link to="/blog" className="hover:text-white transition-colors">Blog & Artigos</Link>
            <span className="text-slate-800 hidden sm:inline">|</span>
            <a href="/login" className="hover:text-white transition-colors">Area Restrita (ERP)</a>
            <span className="text-slate-800 hidden sm:inline">|</span>
            <span>&copy; {new Date().getFullYear()} Gestão TVDE. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>

      {/* 🟢 Microagente de Inteligência Artificial para Apoio Legislativo, Fiscal e Operacional (Disponível 24/7) */}
      <PublicChatWidget />

    </div>
  );
}