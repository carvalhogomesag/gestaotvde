/**
 * NavbarLanding.jsx
 * Localização: src/components/public/NavbarLanding.jsx
 *
 * Barra de navegação pública integrada com Firestore.
 * - Mapeamento dinâmico de serviços por categoria.
 * - Integração automática com o ERP (ServicosConfig).
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Menu, X, Printer, UserCheck, Car, LayoutGrid, Shield, Gift, FileText, BookOpen, GraduationCap } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function NavbarLanding() {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [servicos, setServicos] = useState([]);
  
  const hoverTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  // 1. Carrega serviços ativos em tempo real
  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServicos(lista);
    });
    return () => unsubscribe();
  }, []);

  // 2. Mapeamento de Ícones
  const getIcone = (categoria) => {
    switch(categoria) {
      case 'gratuitos': return Printer; // Dísticos costumam ser aqui
      case 'avulsos': return FileText;
      case 'motoristas': return BookOpen;
      case 'proprietarios': return Car;
      case 'cursos': return GraduationCap;
      default: return Shield;
    }
  };

  // 3. Montagem dinâmica dos itens
  // Incluímos o Dístico fixo no grupo de gratuitos
  const itensMenu = servicos.map(p => ({
    label: p.nome,
    descricao: p.descricao,
    icon: getIcone(p.categoria),
    cor: 'text-blue-600',
    corBg: 'bg-blue-50',
    href: '#planos',
    externo: false
  }));

  // Adiciona o Dístico manualmente se não existir no Firestore
  if (!servicos.find(s => s.nome.includes('Dístico'))) {
    itensMenu.unshift({
      label: 'Gerador de Dísticos',
      descricao: 'Gera o teu dístico TVDE em segundos, gratuitamente',
      icon: Printer,
      cor: 'text-emerald-600',
      corBg: 'bg-emerald-50',
      href: '/gerador-distico',
      externo: true
    });
  }

  // Comportamentos de Hover
  const handleMouseEnter = () => { clearTimeout(hoverTimeoutRef.current); setDropdownAberto(true); };
  const handleMouseLeave = () => { hoverTimeoutRef.current = setTimeout(() => setDropdownAberto(false), 120); };
  const fecharTudo = () => { setMenuMobileAberto(false); setDropdownAberto(false); };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-1.5" onClick={fecharTudo}>
          <span className="text-xl font-black text-slate-900">Gestão</span>
          <span className="text-xl font-black text-blue-600">TVDE</span>
        </Link>

        <div className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-semibold text-slate-600">
          <div ref={dropdownRef} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors hover:bg-slate-50 hover:text-blue-600">
              Serviços <ChevronDown size={15} />
            </button>

            {dropdownAberto && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 max-h-[420px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-150">
                {itensMenu.map((s, idx) => {
                  const Icone = s.icon;
                  return (
                    s.externo 
                    ? <Link key={idx} to={s.href} onClick={fecharTudo} className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.corBg}`}><Icone size={18} className={s.cor} /></div>
                        <div><p className={`text-sm font-bold ${s.cor}`}>{s.label}</p><p className="text-xs text-slate-400">{s.descricao}</p></div>
                      </Link>
                    : <a key={idx} href={s.href} onClick={fecharTudo} className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.corBg}`}><Icone size={18} className={s.cor} /></div>
                        <div><p className={`text-sm font-bold ${s.cor}`}>{s.label}</p><p className="text-xs text-slate-400">{s.descricao}</p></div>
                      </a>
                  );
                })}
              </div>
            )}
          </div>
          <Link to="/blog" className="px-3 py-2 rounded-xl hover:bg-slate-50">Artigos & Legislação</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all">Área de Clientes</Link>
          <button onClick={() => setMenuMobileAberto(!menuMobileAberto)} className="md:hidden p-2 text-slate-600"><Menu size={22} /></button>
        </div>
      </div>
    </nav>
  );
}