import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Car, Building2, CreditCard, ArrowRight } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [allData, setAllData] = useState([]);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Carrega todos os dados uma vez para busca rápida local
  useEffect(() => {
    const loadSearchData = async () => {
      const collections = ['motoristas', 'veiculos', 'proprietarios', 'cartoes'];
      let aggregatedData = [];

      for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        snap.forEach(doc => {
          aggregatedData.push({
            id: doc.id,
            type: col,
            ...doc.data()
          });
        });
      }
      setAllData(aggregatedData);
    };
    loadSearchData();
  }, []);

  // Filtra os dados conforme o usuário digita
  useEffect(() => {
    if (query.length > 1) {
      const filtered = allData.filter(item => {
        const searchString = JSON.stringify(item).toLowerCase();
        return searchString.includes(query.toLowerCase());
      }).slice(0, 8); // Limita a 8 resultados para não poluir
      setResults(filtered);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, allData]);

  // Fecha a busca ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch(type) {
      case 'motoristas': return <User size={16} className="text-green-500" />;
      case 'veiculos': return <Car size={16} className="text-blue-500" />;
      case 'proprietarios': return <Building2 size={16} className="text-indigo-500" />;
      case 'cartoes': return <CreditCard size={16} className="text-orange-500" />;
      default: return <Search size={16} />;
    }
  };

  const getPath = (type) => {
    if (type === 'cartoes') return '/cartoes/abastecimento';
    return `/${type}`;
  };

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Pesquisa inteligente (nome, matrícula, NIF...)"
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-tvde-primary/20 transition-all text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="absolute mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2">
            {results.length > 0 ? (
              results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(getPath(item.type));
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                      {getIcon(item.type)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {item.nome || item.matricula || item.fornecedor}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        em {item.type}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-tvde-primary transition-colors" />
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-slate-400">
                Nenhum resultado encontrado para "{query}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}