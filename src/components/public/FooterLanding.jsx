/**
 * FooterLanding.jsx
 * Localização: src/components/public/FooterLanding.jsx
 *
 * Rodapé institucional público e responsivo.
 */

import React from 'react';
import { Link } from 'react-router-dom';

export default function FooterLanding() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 border-t border-slate-900">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-center md:text-left">
        <div>
          <p className="font-bold text-slate-200 text-sm">Gestão TVDE Portugal, Lda.</p>
          <p className="mt-1 text-slate-500">Avenida da Liberdade 100, 1250-145 Lisboa</p>
          <p className="text-slate-600">geral@gestaotvde.pt - NIF: 500123456</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-slate-500 font-medium items-center">
          <Link to="/blog" className="hover:text-white transition-colors">
            Blog & Artigos
          </Link>
          <span className="text-slate-800 hidden sm:inline">|</span>
          <a href="/login" className="hover:text-white transition-colors">
            Área Restrita (ERP)
          </a>
          <span className="text-slate-800 hidden sm:inline">|</span>
          <span>
            &copy; {new Date().getFullYear()} Gestão TVDE. Todos os direitos reservados.
          </span>
        </div>
      </div>
    </footer>
  );
}