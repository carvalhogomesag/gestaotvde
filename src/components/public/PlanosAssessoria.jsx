/**
 * PlanosAssessoria.jsx
 * Localização: src/components/public/PlanosAssessoria.jsx
 *
 * Secção pública com os pacotes e preços de assessoria regulatória TVDE em Portugal.
 */

import React from 'react';
import { Check } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function PlanosAssessoria({ onEscolherPlano }) {
  return (
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
              <li className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} /> 
                <span>Apoio na escolha de Escolas TVDE</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} /> 
                <span>Orientação para Psicotécnicos</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} /> 
                <span>Guia de instrução para as aplicações</span>
              </li>
            </ul>
          </div>
          <div className="text-left relative mt-auto pt-4 border-t border-slate-50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Investimento único</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(49.00)}</p>
            
            <button
              type="button"
              onClick={() => onEscolherPlano('Plano Essencial (Apoio Documental)')}
              className="w-full mt-3 py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider"
            >
              Tenho Interesse
            </button>
          </div>
        </div>

        {/* Pacote Recomendado / Avançado */}
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
              <li className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} /> 
                <span>Apoio para providenciar exames de Grupo 2</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} /> 
                <span>Organização de ficheiros e submissão no IMT</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} /> 
                <span>Instrução de averbamento do código 997</span>
              </li>
            </ul>
          </div>
          <div className="text-left relative mt-auto pt-4 border-t border-slate-50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Investimento único</p>
            <p className="text-2xl font-black text-blue-600">{formatCurrency(149.00)}</p>

            <button
              type="button"
              onClick={() => onEscolherPlano('Plano Avançado (Organização IMT)')}
              className="w-full mt-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider"
            >
              Tenho Interesse
            </button>
          </div>
        </div>

        {/* Pacote Chave na Mão / Premium */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow select-none">
          <div className="space-y-4 text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Plano Premium</span>
            <h3 className="text-xl font-black text-slate-900">Ativação & Instrução</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Acompanhamento completo de ponta a ponta: apoio na etapa de formação, submissão ao IMT, criação e ativação de contas e instrução sobre o funcionamento das aplicações.
            </p>
            <ul className="space-y-2 pt-2 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} /> 
                <span>Todo o apoio documental e IMT incluído</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} /> 
                <span>Apoio na criação de contas Uber e Bolt</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="text-blue-500 shrink-0" size={14} /> 
                <span>Instrução prático do funcionamento das aplicações</span>
              </li>
            </ul>
          </div>
          <div className="text-left relative mt-auto pt-4 border-t border-slate-50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Investimento único</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(249.00)}</p>

            <button
              type="button"
              onClick={() => onEscolherPlano('Plano Premium (Ativação & Instrução)')}
              className="w-full mt-3 py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider"
            >
              Tenho Interesse
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}