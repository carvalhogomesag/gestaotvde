/**
 * NavbarLanding.jsx
 * Localização: src/components/public/NavbarLanding.jsx
 *
 * Menu multinível dinâmico com experiência visual (UX) premium.
 * - Sincronização em tempo real com o Firestore (onSnapshot) [2].
 * - Organização em duas colunas com divisores subtis para leitura imediata [2].
 * - Hover state de alta reatividade com atraso inteligente para evitar flickers involuntários [2].
 * - Suporte mobile completo (Accordion visual integrado).
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Menu, X, Printer, Gift, FileText, BookOpen, Car, GraduationCap } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

const CATEGORIAS_CONFIG = [
  { id: 'gratuitos', label: 'Serviços Gratuitos', icon: Gift },
  { id: 'avulsos', label: 'Serviços Avulsos', icon: FileText },
  { id: 'motoristas', label: 'Serviços Motoristas', icon: BookOpen },
  { id: 'proprietarios', label: 'Serviços Proprietários', icon: Car },
  { id: 'cursos', label: 'Cursos', icon: GraduationCap }
];

export default function NavbarLanding() {
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [servicosPorCategoria, setServicosPorCategoria] = useState({});
  const hoverTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  // Escuta em tempo real dos serviços ativos para garantir sincronização dinâmica [2]
  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const agrupado = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const cat = data.categoria || 'avulsos';
        if (!agrupado[cat]) agrupado[cat] = [];
        agrupado[cat].push({ id: doc.id, ...data });
      });
      setServicosPorCategoria(agrupado);
    });
    return () => unsubscribe();
  }, []);

  // Fecho do dropdown ao clicar fora (UX para interações móveis/híbridas)
  useEffect(() => {
    const fecharFora = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', fecharFora);
    return () => document.removeEventListener('mousedown', fecharFora);
  }, []);

  const handleMouseEnter = () => { 
    clearTimeout(hoverTimeoutRef.current); 
    setDropdownAberto(true); 
  };

  const handleMouseLeave = () => { 
    hoverTimeoutRef.current = setTimeout(() => {
      setDropdownAberto(false);
    }, 150); 
  };

  const fecharTudo = () => {
    setDropdownAberto(false);
    setMenuMobileAberto(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5" onClick={fecharTudo}>
          <span className="text-xl font-black text-slate-900">Gestão</span>
          <span className="text-xl font-black text-blue-600">TVDE</span>
        </Link>

        {/* Links Principais Desktop */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 text-sm font-semibold text-slate-600">
          
          {/* Dropdown de Serviços Multicategoria */}
          <div 
            ref={dropdownRef} 
            className="relative" 
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
          >
            <button 
              onClick={() => setDropdownAberto(!dropdownAberto)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                dropdownAberto ? 'bg-slate-50 text-blue-600' : 'hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              Serviços 
              <ChevronDown size={14} className={`transition-transform duration-200 ${dropdownAberto ? 'rotate-180' : ''}`} />
            </button>

            {/* Painel Dropdown Desktop (Duas Colunas para Equilíbrio de UX) */}
            {dropdownAberto && (
              <div 
                className="absolute top-full right-0 mt-3.5 w-[560px] bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 grid grid-cols-2 gap-x-6 gap-y-5 animate-in fade-in zoom-in-95 duration-200 z-[100]"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {CATEGORIAS_CONFIG.map(cat => {
                  const itens = servicosPorCategoria[cat.id] || [];
                  const temGratuitoFixo = cat.id === 'gratuitos';
                  
                  // Se a categoria estiver vazia e não for a de gratuitos, omitimos para manter a UI limpa
                  if (itens.length === 0 && !temGratuitoFixo) return null;

                  return (
                    <div key={cat.id} className="space-y-2">
                      {/* Nome da Categoria (Tipografia Limpa) */}
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                        <cat.icon size={13} className="text-blue-500 shrink-0" />
                        <span>{cat.label}</span>
                      </div>
                      
                      {/* Links do Submenu */}
                      <div className="space-y-0.5">
                        {temGratuitoFixo && (
                          <Link 
                            to="/gerador-distico" 
                            onClick={fecharTudo}
                            className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Printer size={13} className="shrink-0" />
                            <span>Gerador de Dísticos</span>
                          </Link>
                        )}
                        {itens.map(s => (
                          <a 
                            key={s.id} 
                            href="#servicos" 
                            onClick={fecharTudo}
                            className="block px-2 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-colors text-left"
                          >
                            {s.nome}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link to="/blog" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors">Artigos & Legislação</Link>
        </div>

        {/* Botão Área de Clientes + Hamburger */}
        <div className="flex items-center gap-3">
          <Link 
            to="/login" 
            className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-sm"
          >
            Área de Clientes
          </Link>

          {/* Hamburger Mobile */}
          <button 
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            className="md:hidden p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            {menuMobileAberto ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Menu Responsivo Mobile */}
      {menuMobileAberto && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-6 pt-4 space-y-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-3">
            {CATEGORIAS_CONFIG.map(cat => {
              const itens = servicosPorCategoria[cat.id] || [];
              const temGratuitoFixo = cat.id === 'gratuitos';

              if (itens.length === 0 && !temGratuitoFixo) return null;

              return (
                <div key={cat.id} className="space-y-1 text-left">
                  {/* Título de Categoria Mobile */}
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-2 py-1 select-none">
                    <cat.icon size={11} className="text-blue-500" />
                    {cat.label}
                  </p>
                  
                  {/* Accordion List no Mobile */}
                  <div className="space-y-0.5 pl-2 border-l border-slate-100 ml-3">
                    {temGratuitoFixo && (
                      <Link 
                        to="/gerador-distico" 
                        onClick={fecharTudo}
                        className="flex items-center gap-2 px-2 py-2 text-xs font-semibold text-emerald-600 hover:bg-slate-50 rounded-lg"
                      >
                        <Printer size={12} />
                        Gerador de Dísticos
                      </Link>
                    )}
                    {itens.map(s => (
                      <a 
                        key={s.id} 
                        href="#servicos" 
                        onClick={fecharTudo}
                        className="block px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg text-left"
                      >
                        {s.nome}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-1 text-left">
            <Link to="/blog" onClick={fecharTudo} className="block px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50">Artigos & Legislação</Link>
          </div>
        </div>
      )}
    </nav>
  );
}