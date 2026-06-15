/**
 * NavbarLanding.jsx
 * Localização: src/components/public/NavbarLanding.jsx
 *
 * Menu multinível dinâmico. Agrupa serviços por categoria (Firestore).
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Menu, X, Printer, Gift, FileText, BookOpen, Car, GraduationCap, Shield } from 'lucide-react';
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
  const [servicosPorCategoria, setServicosPorCategoria] = useState({});
  const hoverTimeoutRef = useRef(null);

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

  const handleMouseEnter = () => { clearTimeout(hoverTimeoutRef.current); setDropdownAberto(true); };
  const handleMouseLeave = () => { hoverTimeoutRef.current = setTimeout(() => setDropdownAberto(false), 150); };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-black">Gestão <span className="text-blue-600">TVDE</span></Link>

        <div className="hidden md:flex items-center gap-6">
          {/* Dropdown Multicategoria */}
          <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <button className="flex items-center gap-1 font-semibold text-slate-600 hover:text-blue-600">
              Serviços <ChevronDown size={14} />
            </button>

            {dropdownAberto && (
              <div className="absolute top-full left-0 mt-2 w-[600px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 grid grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-150">
                {CATEGORIAS_CONFIG.map(cat => (
                  <div key={cat.id} className="space-y-3">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                      <cat.icon size={16} /> {cat.label}
                    </div>
                    <div className="space-y-2">
                      {servicosPorCategoria[cat.id]?.map(s => (
                        <a key={s.id} href="#planos" className="block text-sm text-slate-600 hover:text-blue-600 hover:translate-x-1 transition-all">
                          • {s.nome}
                        </a>
                      ))}
                      {cat.id === 'gratuitos' && (
                        <a href="/gerador-distico" className="block text-sm text-emerald-600 font-bold hover:underline">• Gerador de Dísticos</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link to="/blog" className="font-semibold text-slate-600 hover:text-blue-600">Artigos & Legislação</Link>
        </div>
      </div>
    </nav>
  );
}