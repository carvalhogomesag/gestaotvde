/**
 * ServicosTabs.jsx
 * Localização: src/components/public/ServicosTabs.jsx
 *
 * Seletor de abas dinâmico em tempo real integrado com o Firestore.
 * - Primeiro nível: Divisão por Público-Alvo (Motoristas vs Proprietários).
 * - Segundo nível: Divisão por Categoria (Gratuitos, Avulsos, Pacotes).
 * - Filtros precisos de dados e feedback visual de estado.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Gift, FileText, Layers, User, Building2, Printer, GraduationCap } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const subCategorias = [
  { id: 'gratuitos', label: 'Gratuitos', icon: Gift },
  { id: 'avulsos', label: 'Avulsos', icon: FileText },
  { id: 'pacotes', label: 'Pacotes', icon: Layers }
];

export default function ServicosTabs({ onEscolherPlano }) {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de navegação bidimensionais
  const [abaPublico, setAbaPublico] = useState('motorista'); // motorista | proprietario
  const [abaSubcat, setAbaSubcat] = useState('pacotes');     // gratuitos | avulsos | pacotes

  // Escuta ativa de serviços parametrizados
  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServicos(lista);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Lógica de filtragem refinada por público-alvo e categoria de dados [2]
  const servicosFiltrados = servicos.filter(s => {
    // 1. Filtra por Público-Alvo
    const matchesPublico = (s.destinatario || 'motorista') === abaPublico;
    if (!matchesPublico) return false;

    // 2. Filtra por Subcategoria
    if (abaSubcat === 'gratuitos') {
      return s.isGratuito === true || s.preco === 0;
    }
    if (abaSubcat === 'pacotes') {
      return s.tipo === 'pacote' && !s.isGratuito && s.preco > 0;
    }
    if (abaSubcat === 'avulsos') {
      return s.tipo === 'avulso' && !s.isGratuito && s.preco > 0;
    }
    return true;
  });

  // Injeção de Cartões Estáticos Adicionais (Gerador de Dísticos para Motoristas Gratuitos)
  const exibirGeradorFixo = abaPublico === 'motorista' && abaSubcat === 'gratuitos';

  return (
    <section id="servicos" className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-300">
      
      {/* Título */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900">Nossos Serviços</h2>
        <p className="text-slate-500 text-xs sm:text-sm">
          Explore soluções burocráticas, formação de motoristas e assessoria técnica para operadores em Portugal.
        </p>
      </div>

      {/* NÍVEL 1: Segmentador de Público-Alvo (Motoristas vs Proprietários) */}
      <div className="flex justify-center gap-3 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto select-none">
        <button
          type="button"
          onClick={() => { setAbaPublico('motorista'); setAbaSubcat('pacotes'); }}
          className={`px-5 sm:px-6 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            abaPublico === 'motorista' 
              ? 'bg-slate-950 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User size={14} />
          🙋‍♂️ Para Motoristas
        </button>
        <button
          type="button"
          onClick={() => { setAbaPublico('proprietario'); setAbaSubcat('pacotes'); }}
          className={`px-5 sm:px-6 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            abaPublico === 'proprietario' 
              ? 'bg-slate-950 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 size={14} />
          🏢 Para Proprietários
        </button>
      </div>

      {/* NÍVEL 2: Abas de Categorias (Hover State Inteligente) */}
      <div className="flex flex-wrap justify-center gap-2 bg-slate-100 p-1 rounded-xl w-fit mx-auto select-none">
        {subCategorias.map((cat) => (
          <button
            key={cat.id}
            onMouseEnter={() => setAbaSubcat(cat.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              abaSubcat === cat.id 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <cat.icon size={13} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de Exibição Dinâmica */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300 min-h-[250px]">
        {loading ? (
          <div className="col-span-full text-center py-10 text-slate-400">
            <Loader2 className="animate-spin mx-auto mb-2 text-tvde-primary" />
            <span className="text-xs font-semibold">A carregar serviços...</span>
          </div>
        ) : (servicosFiltrados.length > 0 || exibirGeradorFixo) ? (
          <>
            {/* Cartão Fixo de Dísticos */}
            {exibirGeradorFixo && (
              <div className="bg-white border-2 border-emerald-500/10 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden">
                <span className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                  Gratuito
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-lg mb-2">Gerador de Dísticos TVDE</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Gere e descarregue o PDF regulamentar das placas TVDE para impressão direta na sua viatura, de forma gratuita.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className="font-black text-emerald-600 text-sm uppercase">Grátis</span>
                  <Link 
                    to="/gerador-distico"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-colors flex items-center gap-1"
                  >
                    <Printer size={12} /> Gerar Agora
                  </Link>
                </div>
              </div>
            )}

            {/* Cartões Dinâmicos da Base de Dados */}
            {servicosFiltrados.map((item) => (
              <div key={item.id} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden">
                
                {/* Badges de Categoria no topo */}
                <div className="absolute top-4 right-4 flex gap-1">
                  {item.isCurso && (
                    <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                      🎓 Curso / Formação
                    </span>
                  )}
                  {item.tipo === 'pacote' && (
                    <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                      📦 Pacote
                    </span>
                  )}
                  {item.isGratuito && (
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                      Gratuito
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-black text-slate-900 text-lg mb-2 pr-12 truncate" title={item.nome}>{item.nome}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{item.descricao}</p>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className="font-black text-slate-800 text-sm">
                    {item.isGratuito || item.preco === 0 ? (
                      <span className="text-emerald-600 font-extrabold uppercase">Grátis</span>
                    ) : (
                      formatCurrency(item.preco)
                    )}
                  </span>
                  <button 
                    onClick={() => onEscolherPlano(item.nome)}
                    className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-colors"
                  >
                    Selecionar
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="col-span-full text-center py-10 text-slate-400 italic">
            Nenhum serviço disponível nesta secção de momento.
          </div>
        )}
      </div>
    </section>
  );
}