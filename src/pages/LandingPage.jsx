/**
 * LandingPage.jsx
 * Localização: src/pages/LandingPage.jsx
 *
 * Página inicial pública consolidada (Ficheiro Único Monolítico).
 * Ajustada para fase de pré-lançamento (Aviso "Em Breve", Captação de Leads e Preços com Blur).
 * Integração reativa com o catálogo público de viaturas.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, Check, ArrowRight, Loader2, BookOpen, 
  Car, HelpCircle, FileText, Smartphone, Mail, User, Key,
  CheckCircle2, ChevronDown, ChevronUp, AlertCircle, LogIn, Sparkles 
} from 'lucide-react';
import { db } from '../firebase'; 
import { registarLeadPública } from '../services/leadService';
import { formatCurrency } from '../utils/formatters';

// Importação do novo componente do catálogo de frotas
import VehicleCatalog from '../components/public/VehicleCatalog';

export default function LandingPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // ─── ESTADOS DE CONTROLO DO HERO (TABS) ──────────────────────────────────
  const [abaHero, setAbaHero] = useState('ebook'); // 'ebook' | 'login'

  // ─── ESTADOS DOS FORMULÁRIOS ──────────────────────────────────────────────
  
  // 1. Isca Digital (Ebook Onboarding)
  const [leadEbook, setLeadEbook] = useState({ nome: '', email: '', telemovel: '' });
  const [loadingEbook, setLoadingEbook] = useState(false);
  const [feedbackEbook, setFeedbackEbook] = useState(null);

  // 2. Procura de Viatura
  const [leadCarro, setLeadCarro] = useState({ nome: '', email: '', telemovel: '', regiao: 'Lisboa', mensagem: '' });
  const [loadingCarro, setLoadingCarro] = useState(false);
  const [feedbackCarro, setFeedbackCarro] = useState(null);

  // 3. Login Direto Integrado
  const [credenciais, setCredenciais] = useState({ email: '', password: '' });
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [feedbackLogin, setFeedbackLogin] = useState(null);

  // 4. Acordeão de FAQs
  const [faqAtiva, setFaqAtiva] = useState(null);

  // ─── ESCUTADOR DE SELEÇÃO DE VIATURAS DO CATÁLOGO [NOVO] ────────────────
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

    // Adiciona o escutador de eventos customizado
    window.addEventListener('selecionarVeiculoCatalogo', lidarComSelecaoVeiculo);
    
    // Remove o escutador ao desmontar para evitar fugas de memória
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

  // ─── SUBMISSÃO DOS FORMULÁRIOS ───────────────────────────────────────────

  // Submissão do Download de Guia
  const handleSubmeterEbook = async (e) => {
    e.preventDefault();
    setLoadingEbook(true);
    setFeedbackEbook(null);

    try {
      console.log("[LandingPage] A iniciar submissão de lead de ebook para acesso antecipado...");
      const res = await registarLeadPública({
        nome: leadEbook.nome,
        email: leadEbook.email,
        telemovel: leadEbook.telemovel,
        origem: 'isca_ebook',
        mensagemAdicional: 'Solicitou acesso antecipado ao e-book Guia de Onboarding (Em Breve).'
      });

      if (res.sucesso) {
        res.msg = "Inscrição antecipada realizada com sucesso! O e-book ser-lhe-á enviado diretamente para o email assim que for publicado.";
        setLeadEbook({ nome: '', email: '', telemovel: '' });
      }
      setFeedbackEbook(res);
    } catch (err) {
      console.error(err);
      setFeedbackEbook({ sucesso: false, msg: "Erro técnico de rede. Tente de novo." });
    } finally {
      setLoadingEbook(false);
    }
  };

  // Submissão de Procura de Carro
  const handleSubmeterCarro = async (e) => {
    e.preventDefault();
    setLoadingCarro(true);
    setFeedbackCarro(null);

    try {
      console.log("[LandingPage] A iniciar submissão de lead de aluguer de viatura...");
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

  // Submissão de Autenticação Direta do Portal
  const handleLoginDireto = async (e) => {
    e.preventDefault();
    if (!credenciais.email || !credenciais.password) {
      setFeedbackLogin({ tipo: 'erro', texto: 'Preencha todos os campos.' });
      return;
    }

    setLoadingLogin(true);
    setFeedbackLogin(null);
    try {
      console.log("[LandingPage] A iniciar tentativa de autenticação direta no Firebase...");
      await login(credenciais.email, credenciais.password);
      
      console.log("[LandingPage] Autenticado com sucesso. A redirecionar para o ERP...");
      navigate('/dashboard');
    } catch (err) {
      console.error("[LandingPage] Erro de login:", err);
      setFeedbackLogin({ tipo: 'erro', texto: 'Credenciais inválidas. Verifique os dados.' });
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans scroll-smooth">
      
      {/* ─── 1. BARRA DE NAVEGAÇÃO SUPERIOR ────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-slate-900">Gestão</span>
            <span className="text-xl font-black text-blue-600">TVDE</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#servicos" className="hover:text-blue-600 transition-colors">Assessoria</a>
            <a href="#catalogo" className="hover:text-blue-600 transition-colors">Catálogo de Viaturas</a>
            <a href="#aluguer" className="hover:text-blue-600 transition-colors">Aluguer de Viaturas</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">Dúvidas Comuns</a>
          </div>

          <div>
            <a 
              href="/login" 
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xs"
            >
              Área de Clientes
            </a>
          </div>
        </div>
      </nav>

      {/* 🚀 FAIXA GLOBAL DE "EM BREVE / PRÉ-LANÇAMENTO" */}
      <div className="bg-blue-600 text-white text-center py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-xs shrink-0 select-none">
        <Sparkles size={13} className="animate-pulse" />
        <span>O nosso portal de e-books e assessoria está em fase final de lançamento. Garanta já o seu registo antecipado!</span>
      </div>

      {/* ─── 2. SECÇÃO HERO (ISCA DIGITAL E LOGIN INCORPORADOS) ──────────────── */}
      <header className="relative py-16 md:py-24 px-6 bg-radial from-slate-900 to-slate-950 text-white overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Lado Esquerdo: Proposta de Valor */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
              <Shield size={12} />
              Assessoria de Apoio Documental & Plataformas
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
              Apoio e Assessoria especializada para Motoristas TVDE
            </h1>
            <p className="text-slate-300 text-base md:text-lg font-medium leading-relaxed max-w-xl">
              Apoiamos em todas as etapas regulatórias em Portugal: apoio na etapa de formação homologada, orientação para providenciar documentos obrigatórios (exames e psicotécnicos de Grupo 2), organização de documentos junto do IMT, criação de contas e instrução prática das aplicações Uber e Bolt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={16} />
                <span>Apoio na Etapa de Formação</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={16} />
                <span>Organização Governamental (IMT)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={16} />
                <span>Criação de Contas & Instrução</span>
              </div>
            </div>
          </div>

          {/* Lado Direito: Caixa com Separadores (Conversão Ebook vs. Login Rápido) */}
          <div className="lg:col-span-5 bg-white text-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md mx-auto w-full">
            
            {/* Seletor de Separadores */}
            <div className="grid grid-cols-2 gap-2 mb-5 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setAbaHero('ebook')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  abaHero === 'ebook' 
                    ? 'bg-white text-indigo-600 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📥 Candidatura (Ebook)
              </button>
              <button
                type="button"
                onClick={() => setAbaHero('login')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  abaHero === 'login' 
                    ? 'bg-white text-indigo-600 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🔐 Área de Membros
              </button>
            </div>

            {/* A: CONTEÚDO DA ISCA DIGITAL (EBOOK - COM NOTA DE EM BREVE) */}
            {abaHero === 'ebook' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-blue-600">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Acesso Antecipado</span>
                  </div>
                  <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Em Breve
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 leading-tight">Garanta o Guia de Onboarding</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  O nosso e-book oficial está em fase final de paginação [1]. Registe o seu telemóvel e email hoje para garantir o download gratuito imediato assim que for publicado [1]!
                </p>

                <form onSubmit={handleSubmeterEbook} className="space-y-3.5 text-left">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" required placeholder="O seu nome completo"
                      value={leadEbook.nome}
                      onChange={e => setLeadEbook({ ...leadEbook, nome: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="email" required placeholder="O seu endereço de email"
                      value={leadEbook.email}
                      onChange={e => setLeadEbook({ ...leadEbook, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="tel" required placeholder="O seu número de telemóvel"
                      value={leadEbook.telemovel}
                      onChange={e => setLeadEbook({ ...leadEbook, telemovel: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={loadingEbook}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 cursor-pointer animate-pulse"
                  >
                    {loadingEbook ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <FileText size={14} />
                    )}
                    Garantir Acesso Antecipado
                  </button>
                </form>

                {feedbackEbook && (
                  <div className={`flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2.5 border ${
                    feedbackEbook.sucesso 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-red-50 text-red-700 border-red-100'
                  }`}>
                    {feedbackEbook.sucesso ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span className="leading-relaxed">{feedbackEbook.msg}</span>
                  </div>
                )}
              </div>
            )}

            {/* B: CONTEÚDO DO LOGIN RÁPIDO DO PORTAL/ERP */}
            {abaHero === 'login' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-indigo-600">
                  <LogIn size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Acesso Restrito</span>
                </div>
                <h3 className="text-base font-black text-slate-900 leading-tight">Área de Clientes & Gestores</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Introduza os seus dados de acesso configurados para aceder ao ERP interno e controlo de frotas.
                </p>

                <form onSubmit={handleLoginDireto} className="space-y-3.5 text-left">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="email" 
                      required 
                      placeholder="Email de registo"
                      value={credenciais.email}
                      onChange={e => setCredenciais({ ...credenciais, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="password" 
                      required 
                      placeholder="Palavra-passe"
                      value={credenciais.password}
                      onChange={e => setCredenciais({ ...credenciais, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={loadingLogin}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 cursor-pointer"
                  >
                    {loadingLogin ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <LogIn size={14} />
                    )}
                    Entrar no Sistema Restrito
                  </button>
                </form>

                {feedbackLogin && (
                  <div className="flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2.5 border bg-red-50 text-red-700 border-red-100">
                    <AlertCircle size={14} />
                    <span>{feedbackLogin.texto}</span>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </header>

      {/* ─── 3. SECÇÃO DOS PACOTES DE ASSESSORIA PÚBLICOS (COM BLUR NOS PREÇOS) ─── */}
      <section id="servicos" className="py-20 px-6 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">Pacotes de Apoio à sua medida</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Escolha o nível de assessoria e acompanhamento ideal para estruturar a sua formação, organizar documentos no IMT e ativar as suas contas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Pacote Básico / Essencial */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow select-none">
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
            <div className="text-left relative">
              <p className="text-xs text-slate-400 font-semibold uppercase">Investimento único</p>
              <p className="text-2xl font-black text-slate-900 filter blur-[5px] select-none">{formatCurrency(49.00)}</p>
              <span className="text-[10px] font-bold text-blue-600 block mt-1">Preço disponível em breve</span>
            </div>
          </div>

          {/* Pacote Recomendado */}
          <div className="bg-white border-2 border-blue-600 rounded-2xl p-6 flex flex-col justify-between space-y-6 relative shadow-sm select-none">
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
            <div className="text-left relative">
              <p className="text-xs text-slate-400 font-semibold uppercase">Investimento único</p>
              <p className="text-2xl font-black text-blue-600 filter blur-[5px] select-none">{formatCurrency(149.00)}</p>
              <span className="text-[10px] font-bold text-blue-600 block mt-1">Preço disponível em breve</span>
            </div>
          </div>

          {/* Pacote Chave na Mão */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow select-none">
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
            <div className="text-left relative">
              <p className="text-xs text-slate-400 font-semibold uppercase">Investimento único</p>
              <p className="text-2xl font-black text-slate-900 filter blur-[5px] select-none">{formatCurrency(249.00)}</p>
              <span className="text-[10px] font-bold text-blue-600 block mt-1">Preço disponível em breve</span>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 4. CATÁLOGO INTERATIVO DE VIATURAS [NOVO] ──────────────────────── */}
      <VehicleCatalog />

      {/* ─── 5. SECÇÃO DE PROCURA DE VIATURAS (MATCHING DE ALUGUER) ───────────── */}
      <section id="aluguer" className="bg-slate-900 text-white py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <Car size={12} />
              Frota de Viaturas TVDE Disponível
            </div>
            <h2 className="text-2xl md:text-3xl font-black leading-tight">Procura uma viatura para trabalhar?</h2>
            <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
              Asseguramos contacto com operadores licenciados que disponibilizam viaturas em conformidade regulatória nas plataformas, equipadas com seguros TVDE específicos (responsabilidade civil e passageiros), Via Verde e cartões de desconto de combustível.
            </p>
            <div className="space-y-3.5 text-xs font-semibold text-slate-200">
              <p className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Manutenção e Oficina a cargo do Operador parceiro</p>
              <p className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Cobertura total de Seguros de Passageiros e Ocupantes</p>
              <p className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Modelos económicos e elétricos de alta autonomia</p>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white text-slate-800 rounded-3xl p-6 shadow-xl max-w-md mx-auto w-full">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      {/* ─── 6. SECÇÃO DE PERGUNTAS E RESPOSTAS COMUNS (FAQ ACCORDION) ───────── */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <HelpCircle size={32} className="text-blue-600 mx-auto" />
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">Perguntas Frequentes (FAQ)</h2>
          <p className="text-slate-500 text-sm">Tudo o que precisa de saber sobre as regras de acesso ao mercado TVDE português.</p>
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

      {/* ─── 7. RODAPÉ INSTITUCIONAL ───────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-6 border-t border-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-center md:text-left">
          <div>
            <p className="font-bold text-slate-200 text-sm">Gestão TVDE Portugal, Lda.</p>
            <p className="mt-1 text-slate-500">Avenida da Liberdade 100, 1250-145 Lisboa</p>
            <p className="text-slate-600">geral@gestaotvde.pt - NIF: 500123456</p>
          </div>
          <div className="flex gap-6 text-slate-500 font-medium">
            <a href="/login" className="hover:text-white transition-colors">Área Restrita (ERP)</a>
            <span className="text-slate-800">|</span>
            <span>&copy; {new Date().getFullYear()} Gestão TVDE. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}