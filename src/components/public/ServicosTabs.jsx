/**
 * ServicosTabs.jsx
 * Localização: src/components/public/ServicosTabs.jsx
 *
 * Seletor de abas interativo (Hover) para serviços dinâmicos carregados do Firestore.
 * - Sincronização em tempo real com a coleção 'servicos_assessoria'.
 * - Navegação tátil e por hover.
 * - Renderização responsiva otimizada para mobile e desktop.
 */

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { BookOpen, Car, Gift, FileText, GraduationCap } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const categorias = [
  { id: 'gratuitos', label: 'Gratuitos', icon: Gift },
  { id: 'avulsos', label: 'Avulsos', icon: FileText },
  { id: 'motoristas', label: 'Motoristas', icon: BookOpen },
  { id: 'proprietarios', label: 'Proprietários', icon: Car },
  { id: 'cursos', label: 'Cursos', icon: GraduationCap }
];

export default function ServicosTabs({ onEscolherPlano }) {
  const [servicos, setServicos] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('gratuitos');
  const [loading, setLoading] = useState(true);

  // Escuta em tempo real dos serviços ativos na base de dados
  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServicos(lista);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filtra serviços pela categoria ativa (fallback para 'avulsos' para compatibilidade retroativa)
  const servicosFiltrados = servicos.filter(s => (s.categoria || 'avulsos') === categoriaAtiva);

  return (
    <section id="servicos" className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto space-y-10">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900">Nossos Serviços</h2>
        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
          Explore as soluções de assessoria regulatória, formação e suporte operacional para o setor TVDE.
        </p>
      </div>

      {/* Seletor de Abas de Serviços (Responsivo e Hover) */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto select-none">
        {categorias.map((cat) => (
          <button
            key={cat.id}
            onMouseEnter={() => setCategoriaAtiva(cat.id)}
            className={`px-4 sm:px-6 py-2.5 text-[10px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              categoriaAtiva === cat.id 
                ? 'bg-slate-950 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <cat.icon size={14} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Conteúdo Dinâmico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300 min-h-[250px]">
        {loading ? (
          <div className="col-span-full text-center py-10 text-slate-400">A carregar serviços...</div>
        ) : servicosFiltrados.length > 0 ? (
          servicosFiltrados.map((item) => (
            <div key={item.id} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-2">{item.nome}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.descricao}</p>
              </div>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                <span className="font-black text-tvde-primary text-sm">{formatCurrency(item.preco)}</span>
                <button 
                  onClick={() => onEscolherPlano(item.nome)}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-tvde-primary transition-colors"
                >
                  Selecionar
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-slate-400 italic">
            Nenhum serviço disponível nesta categoria.
          </div>
        )}
      </div>
    </section>
  );
}