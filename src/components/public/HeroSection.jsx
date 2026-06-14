/**
 * HeroSection.jsx
 * Localização: src/components/public/HeroSection.jsx
 *
 * Secção de topo com Faixa de Destaque, Carrossel de Texto dinâmico e Formulário de Acesso ao eGuia.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, Check, ArrowRight, Loader2, BookOpen, 
  Car, Printer, ChevronLeft, ChevronRight, Sparkles, 
  User, Smartphone, AlertCircle 
} from 'lucide-react';
import ReactGA from 'react-ga4';
import { registarLeadPública } from '../../services/leadService';

export default function HeroSection() {
  const navigate = useNavigate();

  // Controlo do Carrossel de Texto à Esquerda (Hero)
  const [slideTexto, setSlideAtivo] = useState(0);
  const totalSlides = 3;

  // Isca Digital (eGuia Onboarding - Apenas Nome e Telemóvel)
  const [leadGuia, setLeadGuia] = useState({ nome: '', telemovel: '' });
  const [loadingGuia, setLoadingGuia] = useState(false);
  const [feedbackGuia, setFeedbackGuia] = useState(null);

  // Rotação automática do carrossel de texto
  useEffect(() => {
    const temporizador = setInterval(() => {
      setSlideAtivo((prev) => (prev + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(temporizador);
  }, []);

  const handleProximoSlide = () => setSlideAtivo((prev) => (prev + 1) % totalSlides);
  const handleSlideAnterior = () => setSlideAtivo((prev) => (prev - 1 + totalSlides) % totalSlides);

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

  return (
    <>
      {/* 🚀 FAIXA GLOBAL DE "NOVIDADE" RESPONSIVA */}
      <div className="bg-blue-600 text-white text-center py-2.5 px-4 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-2 shadow-xs shrink-0 select-none">
        <Sparkles size={12} className="animate-pulse shrink-0" />
        <span>O nosso eGuia oficial para novos motoristas TVDE em Portugal já está disponível. Aceda grátis!</span>
      </div>

      {/* SECÇÃO HERO */}
      <header className="relative py-12 md:py-24 px-4 sm:px-6 bg-slate-950 text-white overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LADO ESQUERDO: Carrossel de Texto Rotativo */}
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
                    Precisa de colocar as placas regulamentares na sua viatura? Insira a sua licença de operador e obtenha um ficheiro PDF A4 pronto a imprimir à escala real exata (145x68mm) com as marcas de corte oficiais do IMT.
                  </p>
                  
                  <div className="flex flex-wrap gap-4 pt-1">
                    <Link 
                      to="/gerador-distico"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer uppercase tracking-wider"
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

            {/* CONTROLOS DO CARROSSEL DE TEXTO */}
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

          {/* LADO DIREITO: Form do eGuia Fixo e Estático */}
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
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 cursor-pointer"
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
    </>
  );
}