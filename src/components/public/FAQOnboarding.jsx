/**
 * FAQOnboarding.jsx
 * Localização: src/components/public/FAQOnboarding.jsx
 *
 * Secção de Perguntas Frequentes (FAQ) interativa em formato de acordeão,
 * abordando as dúvidas burocráticas mais comuns do onboarding TVDE em Portugal.
 */

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQOnboarding() {
  // Estado para controlar qual pergunta está expandida (null se nenhuma estiver)
  const [perguntaAberta, setPerguntaAtiva] = useState(null);

  const faqs = [
    {
      id: 1,
      pergunta: "Quais os requisitos obrigatórios para tirar o certificado TVDE?",
      resposta: "Para requerer o certificado no IMT, deve cumprir as seguintes exigências regulatórias: ter carta de condução de categoria B há mais de 3 anos, obter averbamento do Grupo 2 (exames médicos e psicotécnicos), ter registo criminal sem antecedentes impeditivos para transporte de passageiros, e obter aproveitamento num curso de formação TVDE homologado com duração mínima de 50 horas."
    },
    {
      id: 2,
      pergunta: "Quanto custa a emissão da licença diretamente no IMT?",
      resposta: "A taxa legal cobrada pelo IMT (Instituto da Mobilidade e dos Transportes) para a emissão do certificado de motorista TVDE, quando solicitada online através do portal oficial IMT, tem um custo fixo regulamentado de 30,00 €."
    },
    {
      id: 3,
      pergunta: "Posso trabalhar por conta própria nas plataformas sem um Operador?",
      resposta: "Não diretamente. Para ativar as suas contas de motorista na Uber e na Bolt, necessita obrigatoriamente de se vincular a uma empresa licenciada de frota (um Operador TVDE com licença de atividade ativa). Alternativamente, teria de constituir a sua própria empresa e obter uma licença de operador junto do IMT."
    },
    {
      id: 4,
      pergunta: "O que é o averbamento do Grupo 2 (código 997) na Carta de Condução?",
      resposta: "Trata-se de uma anotação administrativa adicionada pelo IMT ao verso da sua carta de condução física (associada ao código nacional 997). Este averbamento atesta que realizou e superou com aproveitamento os exames de aptidão física, mental e psicológica exigidos por lei para a condução profissional de passageiros."
    },
    {
      id: 5,
      pergunta: "Qual é a validade do certificado de motorista TVDE emitido pelo IMT?",
      resposta: "O certificado de motorista TVDE é válido pelo período de 5 anos a contar da data de emissão. Findo este período, para renovar a licença, o motorista deverá frequentar um curso de atualização profissional certificado de 5h e realizar novos exames médicos e psicotécnicos."
    }
  ];

  const alternarPergunta = (id) => {
    setPerguntaAtiva(perguntaAberta === id ? null : id);
  };

  return (
    <section id="faq" className="py-20 px-6 max-w-4xl mx-auto space-y-12">
      
      {/* Cabeçalho da Secção */}
      <div className="text-center space-y-3">
        <HelpCircle size={32} className="text-indigo-600 mx-auto" />
        <h2 className="text-2xl md:text-3xl font-black text-slate-900">Perguntas Frequentes (FAQ)</h2>
        <p className="text-slate-500 text-sm">
          Esclareça as dúvidas administrativas e regulatórias mais comuns sobre o acesso à atividade.
        </p>
      </div>

      {/* Lista de Acordeões */}
      <div className="space-y-3.5 text-left max-w-3xl mx-auto">
        {faqs.map((faq) => {
          const estaAberta = perguntaAberta === faq.id;
          
          return (
            <div 
              key={faq.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
            >
              <button
                type="button"
                onClick={() => alternarPergunta(faq.id)}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left font-bold text-slate-800 text-xs sm:text-sm hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <span>{faq.pergunta}</span>
                {estaAberta ? (
                  <ChevronUp size={16} className="text-indigo-600 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-slate-400 shrink-0" />
                )}
              </button>

              {/* Corpo da Resposta (Animação de expansão limpa) */}
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