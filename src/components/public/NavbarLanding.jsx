/**
 * NavbarLanding.jsx
 * Localização: src/components/public/NavbarLanding.jsx
 *
 * Barra de navegação da Landing Page com:
 * - Dropdown "Serviços" com hover no desktop e clique no mobile
 * - Totalmente responsivo (hamburger menu no mobile)
 * - Links internos via ancora (#) e externos via React Router
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, Menu, X, Printer, UserCheck,
  Car, LayoutGrid, BookOpen, HelpCircle, Sparkles
} from 'lucide-react';

const SERVICOS = [
  {
    label: 'Quero criar os meus dísticos grátis',
    descricao: 'Gera o teu dístico TVDE em segundos, gratuitamente',
    icon: Printer,
    cor: 'text-emerald-600',
    corBg: 'bg-emerald-50',
    href: '/gerador-distico',
    externo: true
  },
  {
    label: 'Quero tornar-me motorista TVDE',
    descricao: 'Assessoria completa desde a formação até à primeira viagem',
    icon: UserCheck,
    cor: 'text-blue-600',
    corBg: 'bg-blue-50',
    href: '#planos',
    externo: false
  },
  {
    label: 'Quero alugar uma viatura',
    descricao: 'Viaturas preparadas para TVDE com suporte incluído',
    icon: Car,
    cor: 'text-violet-600',
    corBg: 'bg-violet-50',
    href: '#aluguer',
    externo: false
  },
  {
    label: 'Catálogo de Viaturas',
    descricao: 'Consulta toda a nossa frota disponível',
    icon: LayoutGrid,
    cor: 'text-slate-600',
    corBg: 'bg-slate-50',
    href: '#catalogo',
    externo: false
  }
];

export default function NavbarLanding() {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [dropdownAberto, setDropdownAberto]     = useState(false);
  const hoverTimeoutRef = useRef(null);
  const dropdownRef     = useRef(null);

  // Fecha o dropdown ao clicar fora (mobile)
  useEffect(() => {
    const fecharFora = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', fecharFora);
    return () => document.removeEventListener('mousedown', fecharFora);
  }, []);

  // Hover no desktop — abre com delay para evitar flicker
  const handleMouseEnter = () => {
    clearTimeout(hoverTimeoutRef.current);
    setDropdownAberto(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setDropdownAberto(false);
    }, 120);
  };

  const fecharTudo = () => {
    setMenuMobileAberto(false);
    setDropdownAberto(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <Link to="/" className="flex items-center gap-1.5" onClick={fecharTudo}>
          <span className="text-xl font-black text-slate-900">Gestão</span>
          <span className="text-xl font-black text-blue-600">TVDE</span>
        </Link>

        {/* ── Links desktop ─────────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-semibold text-slate-600">

          {/* Dropdown Serviços */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={() => setDropdownAberto(!dropdownAberto)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${
                dropdownAberto
                  ? 'bg-blue-50 text-blue-600'
                  : 'hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              Serviços
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${dropdownAberto ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Painel do dropdown */}
            {dropdownAberto && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-150"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {SERVICOS.map((s) => {
                  const Icone = s.icon;
                  const conteudo = (
                    <div
                      key={s.label}
                      className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={fecharTudo}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.corBg}`}>
                        <Icone size={18} className={s.cor} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${s.cor} group-hover:underline`}>{s.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{s.descricao}</p>
                      </div>
                    </div>
                  );

                  return s.externo
                    ? <Link key={s.label} to={s.href}>{conteudo}</Link>
                    : <a key={s.label} href={s.href}>{conteudo}</a>;
                })}
              </div>
            )}
          </div>

          <a href="#servicos"  className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors">Nossos Serviços</a>
          <Link to="/blog"    className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors">Artigos & Legislação</Link>
          <a href="#faq"      className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors">Dúvidas Comuns</a>
        </div>

        {/* ── Botão Área de Clientes + Hamburger ───────────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-sm"
          >
            Área de Clientes
          </Link>

          {/* Hamburger — só no mobile */}
          <button
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            className="md:hidden p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors"
            aria-label="Menu"
          >
            {menuMobileAberto ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Menu mobile ───────────────────────────────────────────────────────── */}
      {menuMobileAberto && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-6 pt-4 space-y-1 animate-in slide-in-from-top-2 duration-200">

          {/* Serviços — expandido em lista no mobile */}
          <div className="mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">
              Serviços
            </p>
            {SERVICOS.map((s) => {
              const Icone = s.icon;
              const conteudo = (
                <div
                  key={s.label}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors"
                  onClick={fecharTudo}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.corBg}`}>
                    <Icone size={16} className={s.cor} />
                  </div>
                  <p className={`text-sm font-bold ${s.cor}`}>{s.label}</p>
                </div>
              );

              return s.externo
                ? <Link key={s.label} to={s.href}>{conteudo}</Link>
                : <a key={s.label} href={s.href}>{conteudo}</a>;
            })}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-1">
            <a href="#servicos" onClick={fecharTudo} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-600">Nossos Serviços</a>
            <Link to="/blog" onClick={fecharTudo} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-600">Artigos & Legislação</Link>
            <a href="#faq" onClick={fecharTudo} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-600">Dúvidas Comuns</a>
          </div>
        </div>
      )}
    </nav>
  );
}