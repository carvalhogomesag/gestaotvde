/**
 * NavbarLanding.jsx
 * Localização: src/components/public/NavbarLanding.jsx
 *
 * Barra de navegação da Landing Page integrada com o Firestore.
 * - Consome os serviços ativos parametrizados na área restrita (ERP).
 * - Totalmente responsivo (hamburger menu no mobile).
 * - Otimizado com cores de marca oficiais para Tailwind v4.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, Menu, X, Printer, UserCheck,
  Car, LayoutGrid, Shield
} from 'lucide-react';

// Importação da base de dados e do serviço de assessoria
import { db } from '../../firebase';
import { obterPlanosAssessoria } from '../../services/assessoriaService';

export default function NavbarLanding() {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [dropdownAberto, setDropdownAberto]     = useState(false);
  
  // Estado para armazenar os planos dinâmicos vindos do Firestore
  const [planosDinamicos, setPlanosDinamicos] = useState([]);
  
  const hoverTimeoutRef = useRef(null);
  const dropdownRef     = useRef(null);

  // 1. Carrega os serviços ativos do Firestore
  useEffect(() => {
    const carregarServicos = async () => {
      try {
        const todosServicos = await obterPlanosAssessoria(db);
        // Filtra apenas os serviços ativos para exibição pública
        const ativos = todosServicos.filter(s => s.ativo !== false);
        setPlanosDinamicos(ativos);
      } catch (err) {
        console.error('[NavbarLanding] Erro ao carregar serviços dinâmicos:', err);
      }
    };
    carregarServicos();
  }, []);

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

  // 2. Montagem dinâmica da lista de serviços para o menu
  const itensMenu = [
    // Utilitário estático: Gerador de dístico gratuito
    {
      label: 'Quero criar os meus dísticos grátis',
      descricao: 'Gera o teu dístico TVDE em segundos, gratuitamente',
      icon: Printer,
      cor: 'text-emerald-600',
      corBg: 'bg-emerald-50',
      href: '/gerador-distico',
      externo: true
    },
    // Mapeamento dinâmico dos Serviços de Assessoria registados no Firestore
    ...planosDinamicos.map(p => ({
      label: p.nome,
      descricao: p.descricao,
      icon: p.tipo === 'pacote' ? UserCheck : Shield,
      cor: p.tipo === 'pacote' ? 'text-blue-600' : 'text-indigo-600',
      corBg: p.tipo === 'pacote' ? 'bg-blue-50' : 'bg-indigo-50',
      href: '#planos', // Desloca para a secção de planos
      externo: false
    })),
    // Utilitários de Aluguer e Catálogo
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

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5" onClick={fecharTudo}>
          <span className="text-xl font-black text-slate-900">Gestão</span>
          <span className="text-xl font-black text-blue-600">TVDE</span>
        </Link>

        {/* Links desktop */}
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
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 max-h-[420px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-150"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {itensMenu.map((s, idx) => {
                  const Icone = s.icon;
                  const conteudo = (
                    <div
                      className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group text-left"
                      onClick={fecharTudo}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.corBg}`}>
                        <Icone size={18} className={s.cor} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${s.cor} group-hover:underline`}>{s.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">{s.descricao}</p>
                      </div>
                    </div>
                  );

                  return s.externo
                    ? <Link key={idx} to={s.href}>{conteudo}</Link>
                    : <a key={idx} href={s.href}>{conteudo}</a>;
                })}
              </div>
            )}
          </div>

          <Link to="/blog"    className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors">Artigos & Legislação</Link>
          <a href="#faq"      className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors">Dúvidas Comuns</a>
        </div>

        {/* Botão Área de Clientes + Hamburger */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-3.5 py-2 bg-tvde-dark text-white rounded-xl text-xs font-bold hover:bg-tvde-primary transition-all shadow-sm"
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

      {/* Menu mobile */}
      {menuMobileAberto && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-6 pt-4 space-y-1 max-h-[80vh] overflow-y-auto animate-in slide-in-from-top-2 duration-200">

          {/* Serviços — expandido em lista no mobile */}
          <div className="mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2 text-left">
              Serviços
            </p>
            {itensMenu.map((s, idx) => {
              const Icone = s.icon;
              const conteudo = (
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                  onClick={fecharTudo}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.corBg}`}>
                    <Icone size={16} className={s.cor} />
                  </div>
                  <p className={`text-sm font-bold ${s.cor}`}>{s.label}</p>
                </div>
              );

              return s.externo
                ? <Link key={idx} to={s.href}>{conteudo}</Link>
                : <a key={idx} href={s.href}>{conteudo}</a>;
            })}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-1">
            <Link to="/blog" onClick={fecharTudo} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-600">Artigos & Legislação</Link>
            <a href="#faq" onClick={fecharTudo} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-600">Dúvidas Comuns</a>
          </div>
        </div>
      )}
    </nav>
  );
}