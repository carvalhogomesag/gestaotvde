/**
 * ServicesPackages.jsx
 * Localização: src/components/public/ServicesPackages.jsx
 *
 * Secção pública modular que apresenta e compara os três pacotes de assessoria
 * disponíveis para quem se pretende tornar motorista TVDE em Portugal.
 */

import React from 'react';
import { Check, Shield, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function ServicesPackages() {
  const pacotes = [
    {
      id: 'essencial',
      nomePlano: 'Plano Essencial',
      titulo: 'Apoio Documental',
      descricao: 'Revisão técnica de toda a sua documentação inicial para garantir que cumpre os requisitos do IMT sem falhas ou atrasos.',
      preco: 49.00,
      acresceTaxas: false,
      destaque: false,
      beneficios: [
        'Guia atualizado de Escolas TVDE homologadas',
        'Revisão técnica de exames e psicotécnicos',
        'Validação prévia do Registo Criminal',
        'Checklist completo de submissão no IMT',
        'Suporte por email e WhatsApp durante 30 dias'
      ]
    },
    {
      id: 'avancado',
      nomePlano: 'Plano Avançado',
      titulo: 'Processamento IMT',
      descricao: 'Tratamos de toda a burocracia e submissão do seu pedido de certificado de motorista diretamente no portal do IMT.',
      preco: 149.00,
      acresceTaxas: true,
      destaque: true,
      beneficios: [
        'Apoio no agendamento de Psicotécnicos de Grupo 2',
        'Submissão e acompanhamento do processo no IMT',
        'Apoio no averbamento do código 997 na carta',
        'Revisão documental completa incluída',
        'Suporte prioritário e esclarecimento de pendências'
      ]
    },
    {
      id: 'premium',
      nomePlano: 'Plano Premium',
      titulo: 'Conta Ativa Total',
      descricao: 'Acompanhamento total de ponta a ponta até ter a sua conta ativa e pronta a faturar com frota oficial licenciada.',
      preco: 249.00,
      acresceTaxas: true,
      destaque: false,
      beneficios: [
        'Todo o processamento de licença IMT incluído',
        'Apoio na escolha e agendamento de cursos TVDE',
        'Integração e onboarding nas plataformas Uber e Bolt',
        'Vinculação a um Operador licenciado de frota',
        'Acesso ao material exclusivo de dicas de faturamento'
      ]
    }
  ];

  return (
    <section id="servicos" className="py-20 px-6 max-w-6xl mx-auto space-y-12">
      
      {/* Cabeçalho da Secção */}
      <div className="text-center space-y-3 max-w-xl mx-auto animate-in fade-in duration-300">
        <div className="inline-flex items-center gap-1.5 justify-center text-xs font-black uppercase tracking-wider text-indigo-600">
          <Shield size={14} />
          Serviços de Assessoria Certificada
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900">
          Escolha o nível de suporte que necessita
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          Oferecemos soluções estruturadas para todas as fases da sua formação, exames de Grupo 2 e onboarding regulamentado.
        </p>
      </div>

      {/* Grelha de Pacotes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {pacotes.map((pacote) => {
          return (
            <div 
              key={pacote.id}
              className={`bg-white border rounded-3xl p-6 flex flex-col justify-between space-y-6 transition-all duration-300 relative ${
                pacote.destaque 
                  ? 'border-2 border-indigo-600 shadow-lg scale-102 z-10 md:-translate-y-1' 
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {/* Badge de Recomendado */}
              {pacote.destaque && (
                <span className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-600 text-white text-[9px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                  Mais Solicitado
                </span>
              )}

              {/* Informações Principais */}
              <div className="space-y-4 text-left">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  pacote.destaque ? 'text-indigo-600' : 'text-slate-400'
                }`}>
                  {pacote.nomePlano}
                </span>
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">
                    {pacote.titulo}
                  </h3>
                  <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                    {pacote.descricao}
                  </p>
                </div>

                {/* Lista de Vantagens */}
                <div className="border-t border-slate-100 pt-4 space-y-2.5">
                  {pacote.beneficios.map((beneficio, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                      <Check className="text-indigo-600 shrink-0 mt-0.5" size={13} />
                      <span>{beneficio}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção de Preços */}
              <div className="border-t border-slate-100 pt-4 text-left flex justify-between items-end shrink-0">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Investimento</p>
                  <p className={`text-2xl font-black ${pacote.destaque ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {formatCurrency(pacote.preco)}
                    {pacote.acresceTaxas && (
                      <span className="text-[10px] font-semibold text-slate-400 ml-1 block sm:inline">
                        + Taxas IMT (30€)
                      </span>
                    )}
                  </p>
                </div>
                
                {/* Ícone de Call to Action */}
                <a 
                  href="#aluguer"
                  className={`p-2 rounded-xl border transition-colors ${
                    pacote.destaque 
                      ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700' 
                      : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                  }`}
                  title="Contactar Equipa"
                >
                  <ChevronRight size={16} />
                </a>
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
}