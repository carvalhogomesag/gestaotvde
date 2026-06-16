/**
 * BlogDestaques.jsx
 * Localização: src/components/public/BlogDestaques.jsx
 *
 * Secção de SEO que destaca artigos informativos e legislação do setor TVDE em Portugal.
 * Otimizado com cores de marca oficiais para Tailwind v4.
 * Integrado com rastreio de cliques do Google Analytics 4 (GA4).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, ChevronRight, ArrowRight } from 'lucide-react';
import ReactGA from 'react-ga4'; // ◄ Importado o motor de análise

export default function BlogDestaques() {

  // Bloqueio de rastreio em desenvolvimento local
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );

  const handleArticleClick = (title) => {
    if (!isLocalhost) {
      ReactGA.event({
        category: 'Blog Interactions',
        action: 'Read Article Click',
        label: title
      });
    }
  };

  const handleAccessBlogClick = () => {
    if (!isLocalhost) {
      ReactGA.event({
        category: 'Blog Interactions',
        action: 'View All Blog Click',
        label: 'Aceder ao Blog Completo'
      });
    }
  };

  return (
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
          Esclareça as dúvidas mais comuns sobre CAE, contabilidade, dísticos obrigatórios e processos de regularização junto do IMT [2].
        </p>
      </div>

      {/* Artigos em Destaque (Grelha Horizontal Responsiva) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        
        {/* Artigo 1 */}
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
            <span className="flex items-center gap-1 font-bold text-slate-400">
              <Clock size={12} /> 5 min
            </span>
            <Link 
              to="/blog/cae-correto-tvde-isencao-iva-artigo-53" 
              onClick={() => handleArticleClick("Qual o CAE correto para TVDE e Isenção IVA (Artigo 53)")} // ◄ Evento GA4
              className="font-black text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              Ler Artigo <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Artigo 2 */}
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
            <span className="flex items-center gap-1 font-bold text-slate-400">
              <Clock size={12} /> 6 min
            </span>
            <Link 
              to="/blog/requisitos-licenca-imt-codigo-997" 
              onClick={() => handleArticleClick("Como obter Certificado Motorista TVDE e averbar Codigo 997")} // ◄ Evento GA4
              className="font-black text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              Ler Artigo <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Artigo 3 */}
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
            <span className="flex items-center gap-1 font-bold text-slate-400">
              <Clock size={12} /> 5 min
            </span>
            <Link 
              to="/blog/aima-atrasos-documentais-motoristas-tvde" 
              onClick={() => handleArticleClick("AIMA e TVDE: Gerir atrasos documentais de residencia no IMT")} // ◄ Evento GA4
              className="font-black text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              Ler Artigo <ChevronRight size={14} />
            </Link>
          </div>
        </div>

      </div>

      {/* Botão para ir para o índice do Blog (Atualizado com cores oficiais de tema) */}
      <div className="pt-4">
        <Link 
          to="/blog"
          onClick={handleAccessBlogClick} // ◄ Evento GA4
          className="inline-flex items-center gap-2 px-6 py-3 bg-tvde-dark hover:bg-tvde-primary text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer"
        >
          Aceder ao Blog Completo <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}