/**
 * NavbarLanding.jsx
 * Localização: src/components/public/NavbarLanding.jsx
 *
 * Menu multinível dinâmico com experiência visual (UX) premium.
 * - Sincronização em tempo real com o Firestore (onSnapshot) [2].
 * - Organização do Dropdown em duas colunas: Motoristas vs Proprietários.
 * - Subdivisões internas por tipo: Gratuitos, Avulsos e Pacotes.
 * - Hover state de alta reatividade com atraso inteligente para evitar flickers.
 * - Suporte mobile completo com listagem tátil hierárquica.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronDown, Menu, X, Printer, Gift, FileText, 
  BookOpen, Car, GraduationCap, Layers, User, Building2, Shield 
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function NavbarLanding() {
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  
  // Estado estruturado para guardar os serviços agrupados dinamicamente [2]
  const [servicosAgrupados, setServicosAgrupados] = useState({
    motorista: { gratuitos: [], avulsos: [], pacotes: [] },
    proprietario: { gratuitos: [], avulsos: [], pacotes: [] }
  });

  const hoverTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  // Escuta ativa em tempo real dos serviços ativos na base de dados [2]
  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const agrupado = {
        motorista: { gratuitos: [], avulsos: [], pacotes: [] },
        proprietario: { gratuitos: [], avulsos: [], pacotes: [] }
      };

      // Injeta de forma prioritária o Gerador de Dísticos nos gratuitos do motorista
      agrupado.motorista.gratuitos.push({
        id: 'gerador-distico-fixo',
        nome: 'Gerador de Dísticos',
        isLinkExterno: true,
        href: '/gerador-distico'
      });

      snapshot.forEach(doc => {
        const data = doc.data();
        const dest = data.destinatario || 'motorista'; // Fallback de segurança

        if (agrupado[dest]) {
          if (data.isGratuito || data.preco === 0) {
            agrupado[dest].gratuitos.push({ id: doc.id, ...data });
          } else if (data.tipo === 'pacote') {
            agrupado[dest].pacotes.push({ id: doc.id, ...data });
          } else {
            agrupado[dest].avulsos.push({ id: doc.id, ...data });
          }
        }
      });
      setServicosAgrupados(agrupado);
    });
    return () => unsubscribe();
  }, []);

  // Fecho do dropdown ao clicar fora (UX móvel/híbrida)
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
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5" onClick={fecharTudo}>
          <span className="text-xl font-black text-slate-900">Gestão</span>
          <span className="text-xl font-black text-blue-600">TVDE</span>
        </Link>

        {/* Links Principais Desktop */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 text-sm font-semibold text-slate-600">
          
          {/* Dropdown de Serviços */}
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

            {/* Painel Dropdown Desktop de Duas Colunas (Motoristas vs Proprietários) */}
            {dropdownAberto && (
              <div 
                className="absolute top-full right-0 mt-3.5 w-[580px] bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 grid grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-200 z-[100]"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {/* COLUNA 1: Motoristas */}
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-wider border-b border-slate-100 pb-2">
                    <User size={15} />
                    <span>Para Motoristas</span>
                  </div>
                  
                  {/* Subgrupos de Motoristas */}
                  <div className="space-y-3">
                    {/* Gratuitos */}
                    {servicosAgrupados.motorista.gratuitos.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                          <Gift size={10} /> Gratuitos
                        </p>
                        <div className="space-y-1 pl-2">
                          {servicosAgrupados.motorista.gratuitos.map(s => (
                            s.isLinkExterno ? (
                              <Link key={s.id} to={s.href} onClick={fecharTudo} className="block text-xs font-semibold text-emerald-600 hover:underline">
                                {s.nome}
                              </Link>
                            ) : (
                              <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 hover:text-blue-600">
                                {s.nome}
                              </a>
                            )
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Avulsos */}
                    {servicosAgrupados.motorista.avulsos.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                          <FileText size={10} /> Serviços Avulsos
                        </p>
                        <div className="space-y-1 pl-2">
                          {servicosAgrupados.motorista.avulsos.map(s => (
                            <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 hover:text-blue-600">
                              {s.nome}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pacotes */}
                    {servicosAgrupados.motorista.pacotes.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                          <Layers size={10} /> Pacotes de Assessoria
                        </p>
                        <div className="space-y-1 pl-2">
                          {servicosAgrupados.motorista.pacotes.map(s => (
                            <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 hover:text-blue-600">
                              {s.nome}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUNA 2: Proprietários */}
                <div className="space-y-4 text-left border-l border-slate-100 pl-6">
                  <div className="flex items-center gap-2 text-xs font-black text-purple-600 uppercase tracking-wider border-b border-slate-100 pb-2">
                    <Building2 size={15} />
                    <span>Para Proprietários</span>
                  </div>

                  {/* Subgrupos de Proprietários */}
                  <div className="space-y-3">
                    {/* Gratuitos */}
                    {servicosAgrupados.proprietario.gratuitos.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                          <Gift size={10} /> Gratuitos
                        </p>
                        <div className="space-y-1 pl-2">
                          {servicosAgrupados.proprietario.gratuitos.map(s => (
                            <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 hover:text-blue-600">
                              {s.nome}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Avulsos */}
                    {servicosAgrupados.proprietario.avulsos.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                          <FileText size={10} /> Serviços Avulsos
                        </p>
                        <div className="space-y-1 pl-2">
                          {servicosAgrupados.proprietario.avulsos.map(s => (
                            <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 hover:text-blue-600">
                              {s.nome}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pacotes */}
                    {servicosAgrupados.proprietario.pacotes.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                          <Layers size={10} /> Pacotes de Assessoria
                        </p>
                        <div className="space-y-1 pl-2">
                          {servicosAgrupados.proprietario.pacotes.map(s => (
                            <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 hover:text-blue-600">
                              {s.nome}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

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
          <div className="space-y-4">
            
            {/* SECCÃO MOTORISTAS - MOBILE */}
            <div className="space-y-2 text-left">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-1">
                <User size={12} /> Para Motoristas
              </p>
              <div className="space-y-2 pl-3 border-l border-slate-100 ml-1.5">
                {/* Gratuitos */}
                {servicosAgrupados.motorista.gratuitos.map(s => (
                  s.isLinkExterno ? (
                    <Link key={s.id} to={s.href} onClick={fecharTudo} className="block text-xs font-bold text-emerald-600 py-1">
                      {s.nome}
                    </Link>
                  ) : (
                    <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 py-1">
                      {s.nome}
                    </a>
                  )
                ))}
                {/* Avulsos */}
                {servicosAgrupados.motorista.avulsos.map(s => (
                  <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 py-1">
                    {s.nome}
                  </a>
                ))}
                {/* Pacotes */}
                {servicosAgrupados.motorista.pacotes.map(s => (
                  <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 py-1">
                    {s.nome}
                  </a>
                ))}
              </div>
            </div>

            {/* SECCÃO PROPRIETÁRIOS - MOBILE */}
            <div className="space-y-2 text-left">
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-1">
                <Building2 size={12} /> Para Proprietários
              </p>
              <div className="space-y-2 pl-3 border-l border-slate-100 ml-1.5">
                {/* Gratuitos */}
                {servicosAgrupados.proprietario.gratuitos.map(s => (
                  <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 py-1">
                    {s.nome}
                  </a>
                ))}
                {/* Avulsos */}
                {servicosAgrupados.proprietario.avulsos.map(s => (
                  <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 py-1">
                    {s.nome}
                  </a>
                ))}
                {/* Pacotes */}
                {servicosAgrupados.proprietario.pacotes.map(s => (
                  <a key={s.id} href="#servicos" onClick={fecharTudo} className="block text-xs font-medium text-slate-600 py-1">
                    {s.nome}
                  </a>
                ))}
              </div>
            </div>

          </div>

          <div className="border-t border-slate-100 pt-3 text-left">
            <Link to="/blog" onClick={fecharTudo} className="block px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Artigos & Legislação</Link>
          </div>
        </div>
      )}
    </nav>
  );
}