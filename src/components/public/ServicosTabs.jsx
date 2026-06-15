/**
 * ServicosTabs.jsx
 * Localização: src/components/public/ServicosTabs.jsx
 *
 * Seletor de abas dinâmico.
 * Refatorado para separar claramente 'Planos' (Pacotes) de 'Serviços Avulsos'.
 */

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { BookOpen, Car, Gift, FileText, GraduationCap, Layers } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const categorias = [
  { id: 'gratuitos', label: 'Gratuitos', icon: Gift },
  { id: 'planos', label: 'Planos', icon: Layers }, // Nova Aba para Pacotes
  { id: 'avulsos', label: 'Avulsos', icon: FileText },
  { id: 'motoristas', label: 'Motoristas', icon: BookOpen },
  { id: 'proprietarios', label: 'Proprietários', icon: Car },
  { id: 'cursos', label: 'Cursos', icon: GraduationCap }
];

export default function ServicosTabs({ onEscolherPlano }) {
  const [servicos, setServicos] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('planos'); // Default alterado para Planos
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServicos(lista);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Lógica de filtragem refinada
  const servicosFiltrados = servicos.filter(s => {
    if (categoriaAtiva === 'planos') return s.tipo === 'pacote';
    if (categoriaAtiva === 'avulsos') return s.tipo === 'avulso';
    return (s.categoria || 'avulsos') === categoriaAtiva;
  });

  return (
    <section id="servicos" className="py-16 md:py-20 px-4 max-w-6xl mx-auto space-y-10">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h2 className="text-3xl font-black text-slate-900">Nossos Serviços</h2>
        <p className="text-slate-500 text-sm">Explore as soluções de assessoria regulatória, formação e suporte operacional.</p>
      </div>

      {/* Seletor de Abas */}
      <div className="flex flex-wrap justify-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto">
        {categorias.map((cat) => (
          <button
            key={cat.id}
            onMouseEnter={() => setCategoriaAtiva(cat.id)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              categoriaAtiva === cat.id 
                ? 'bg-slate-950 text-white shadow-lg' 
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <cat.icon size={14} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
        {loading ? (
          <div className="col-span-full text-center py-10 text-slate-400">A carregar...</div>
        ) : servicosFiltrados.length > 0 ? (
          servicosFiltrados.map((item) => (
            <div key={item.id} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
              <div>
                <h3 className="font-black text-slate-900 mb-2">{item.nome}</h3>
                <p className="text-xs text-slate-500 mb-4">{item.descricao}</p>
              </div>
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="font-black text-tvde-primary text-sm">{formatCurrency(item.preco)}</span>
                <button 
                  onClick={() => onEscolherPlano(item.nome)}
                  className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-colors"
                >
                  Selecionar
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-slate-400 italic">
            Nenhum serviço encontrado nesta categoria.
          </div>
        )}
      </div>
    </section>
  );
}