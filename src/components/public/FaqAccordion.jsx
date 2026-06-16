/**
 * FaqAccordion.jsx
 * Localização: src/components/public/FaqAccordion.jsx
 *
 * Secção de Perguntas Frequentes (FAQ) interativa com acordeão responsivo.
 * Integrada com rastreio de cliques do Google Analytics 4 (GA4).
 */

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ReactGA from 'react-ga4'; // ◄ Importado o motor de análise

export default function FaqAccordion() {
  const [faqAtiva, setFaqAtiva] = useState(null);

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
      resposta: "Garantimos a organização estruturada de todo o seu dossiê de candidatura e tratamos de todo o processo de submissão del pedido de certificado de motorista diretamente junto do portal oficial do IMT online, acompanhando quaisquer exigências e garantindo a correta atribuição de taxas."
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

  /**
   * Controla a alternância visual das FAQs e dispara eventos inteligentes para o GA4 [4]
   */
  const handleToggle = (faq) => {
    const estaAberta = faqAtiva === faq.id;
    setFaqAtiva(estaAberta ? null : faq.id);

    // Envia evento de interação apenas ao abrir (e bloqueia se for localhost) [4]
    if (!estaAberta) {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocalhost) {
        ReactGA.event({
          category: 'FAQ Interactions',
          action: 'Open FAQ',
          label: faq.pergunta
        });
      }
    }
  };

  return (
    <section id="faq" className="py-16 md:py-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-12 border-t border-slate-200">
      <div className="text-center space-y-2">
        <HelpCircle size={32} className="text-blue-600 mx-auto" />
        <h2 className="text-2xl md:text-3xl font-black text-slate-900">Perguntas Frequentes (FAQ)</h2>
        <p className="text-slate-500 text-xs sm:text-sm">
          Tudo o que precisa de saber sobre as regras de acesso ao mercado TVDE português.
        </p>
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
                onClick={() => handleToggle(faq)} // ◄ Chamada da nova função orquestradora
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
  );
}