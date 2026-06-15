/**
 * ServicosConfig.jsx
 * Localização: src/pages/ServicosConfig.jsx
 *
 * Página unificada de parametrização de serviços e pacotes do ecossistema.
 * Apenas acessível a Administradores (Diretores).
 * - Listagem com filtros rápidos em tempo real.
 * - Modal "Novo Serviço" estruturado em Wizard de 3 etapas.
 * - Suporte dinâmico para composição de pacotes por associação.
 * - Suporte a links externos/páginas especiais de redirecionamento (ex: /gerador-distico).
 * - Auto-Sementeira (Seeding) automática para Gerador de Dísticos e eGuia no Firestore [2].
 */

import React, { useState, useEffect } from 'react';
import { 
  Sliders, Plus, Edit, Loader2, Lock, DollarSign, Layers, 
  User, Building2, FileText, Check, ChevronLeft, ArrowRight, 
  Gift, GraduationCap, Eye, EyeOff, Link2
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { logAcaoGlobal } from '../utils/logger';
import { formatCurrency } from '../utils/formatters';
import { obterPlanosAssessoria } from '../services/assessoriaService';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

export default function ServicosConfig() {
  const { userData, loading: authLoading } = useAuth();
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtro de exibição local ativo
  const [filtroAtivo, setFiltroAtivo] = useState('todos');

  // Controlos do Modal e do Wizard
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passo, setPasso] = useState(1); // 1: Destinatário | 2: Tipo | 3: Detalhes
  const [editingPlano, setEditingPlano] = useState(null);

  // Schema de dados otimizado
  const [formData, setFormData] = useState({
    nome: '',
    destinatario: 'motorista', // motorista | proprietario
    tipo: 'avulso', // avulso | pacote
    preco: '',
    descricao: '',
    isGratuito: false,
    isCurso: false,
    linkExterno: '', // Campo opcional para redirecionamento
    ativo: true,
    itens: [] // IDs de serviços avulsos incluídos caso seja pacote
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const dados = await obterPlanosAssessoria(db);
      
      // ◄ AUTO-SEEMENTEIRA (SEEDING): Verifica se os recursos nativos de sistema existem no Firestore [2]
      const idsExistentes = dados.map(d => d.id);
      let houveAlteracao = false;

      const disticoDefault = {
        id: 's-gerador-de-disticos-tvde',
        nome: 'Gerador de Dísticos TVDE',
        destinatario: 'motorista',
        tipo: 'avulso',
        preco: 0,
        isGratuito: true,
        isCurso: false,
        linkExterno: '/gerador-distico',
        descricao: 'Gere e descarregue o PDF regulamentar das placas TVDE para impressão direta na sua viatura, de forma gratuita.',
        ativo: true,
        atualizadoEm: new Date().toISOString()
      };

      const eGuiaDefault = {
        id: 's-guia-de-onboarding-e-legalizacao',
        nome: 'Guia de Onboarding e Legalização',
        destinatario: 'motorista',
        tipo: 'avulso',
        preco: 0,
        isGratuito: true,
        isCurso: false,
        linkExterno: '/guia-onboarding',
        descricao: 'O guia regulamentar e prático para quem está a iniciar o processo de legalização como motorista TVDE em Portugal.',
        ativo: true,
        atualizadoEm: new Date().toISOString()
      };

      // Se o Dístico regulamentar não existir na base de dados, cria-o automaticamente [2]
      if (!idsExistentes.includes(disticoDefault.id)) {
        await setDoc(doc(db, 'servicos_assessoria', disticoDefault.id), disticoDefault);
        houveAlteracao = true;
      }

      // Se o eGuia regulamentar não existir na base de dados, cria-o automaticamente [2]
      if (!idsExistentes.includes(eGuiaDefault.id)) {
        await setDoc(doc(db, 'servicos_assessoria', eGuiaDefault.id), eGuiaDefault);
        houveAlteracao = true;
      }

      if (houveAlteracao) {
        // Se alguma sementeira ocorreu, recarrega os dados atualizados de imediato [2]
        const dadosAtualizados = await obterPlanosAssessoria(db);
        setPlanos(dadosAtualizados);
      } else {
        setPlanos(dados);
      }

    } catch (error) {
      console.error('[ServicosConfig] Erro ao carregar/seedar planos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.role === 'admin') {
      carregarDados();
    }
  }, [userData]);

  // BLOQUEIO DE SEGURANÇA
  if (!authLoading && userData?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
          Apenas o Diretor tem permissão para configurar os planos de assessoria e alterar tabelas de preços.
        </p>
        <Button variant="secondary" className="mt-6 h-10 text-xs" onClick={() => window.location.href = '/dashboard'}>
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  // Filtragem local instantânea baseada nas propriedades de dados
  const planosFiltrados = planos.filter(p => {
    if (filtroAtivo === 'todos') return true;
    if (filtroAtivo === 'motoristas') return p.destinatario === 'motorista';
    if (filtroAtivo === 'proprietarios') return p.destinatario === 'proprietario';
    if (filtroAtivo === 'pacotes') return p.tipo === 'pacote';
    if (filtroAtivo === 'avulsos') return p.tipo === 'avulso' && !p.isGratuito && !p.isCurso;
    if (filtroAtivo === 'gratuitos') return p.isGratuito === true || p.preco === 0;
    if (filtroAtivo === 'cursos') return p.isCurso === true;
    return true;
  });

  const handleEditClick = (plano) => {
    setEditingPlano(plano);
    setFormData({
      nome: plano.nome || '',
      destinatario: plano.destinatario || 'motorista',
      tipo: plano.tipo || 'avulso',
      preco: plano.preco || '',
      descricao: plano.descricao || '',
      isGratuito: plano.isGratuito || false,
      isCurso: plano.isCurso || false,
      linkExterno: plano.linkExterno || '',
      ativo: plano.ativo ?? true,
      itens: plano.itens || []
    });
    setPasso(3); // Salta diretamente para o formulário de detalhes
    setIsModalOpen(true);
  };

  const handleNovoClick = () => {
    setEditingPlano(null);
    setFormData({
      nome: '',
      destinatario: 'motorista',
      tipo: 'avulso',
      preco: '',
      descricao: '',
      isGratuito: false,
      isCurso: false,
      linkExterno: '',
      ativo: true,
      itens: []
    });
    setPasso(1); // Inicia o wizard no primeiro passo
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const operador = userData?.nome || 'Diretor';
      const idDoc = editingPlano 
        ? editingPlano.id 
        : 's-' + formData.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const precoFinal = formData.isGratuito ? 0 : Number(formData.preco || 0);

      const dadosParaGravar = {
        ...formData,
        preco: precoFinal,
        id: idDoc,
        itens: formData.tipo === 'pacote' ? (formData.itens || []) : [],
        atualizadoEm: new Date().toISOString()
      };

      await setDoc(doc(db, 'servicos_assessoria', idDoc), dadosParaGravar);

      await logAcaoGlobal(
        operador,
        editingPlano ? 'Edição Serviço' : 'Criação Serviço',
        'Configurações',
        `${editingPlano ? 'Atualizou' : 'Criou'} o serviço: ${formData.nome} (${formData.destinatario} | ${formData.tipo}) por ${precoFinal}€`,
        idDoc
      );

      setIsModalOpen(false);
      await carregarDados();
    } catch (error) {
      console.error('[ServicosConfig] Erro ao gravar serviço:', error);
      alert('Erro ao gravar o serviço.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full p-2.5 border border-slate-200 rounded-xl outline-none transition-all text-xs sm:text-sm bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300";

  return (
    <div className="space-y-6">
      {/* Header Responsivo */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 leading-tight">
            <Sliders className="text-tvde-primary shrink-0" size={24} />
            Gestão Integrada de Serviços
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">Parametrize serviços, preços e pacotes dinâmicos do ecossistema TVDE.</p>
        </div>
        <Button 
          onClick={handleNovoClick}
          className="w-full sm:w-auto justify-center text-xs sm:text-sm h-10"
        >
          <Plus size={18} /> Novo Serviço / Pacote
        </Button>
      </header>

      {/* Filtros Rápidos (UX Premium de Abas Interativas) */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'motoristas', label: 'Motoristas' },
          { id: 'proprietarios', label: 'Proprietários' },
          { id: 'pacotes', label: 'Pacotes' },
          { id: 'avulsos', label: 'Avulsos' },
          { id: 'gratuitos', label: 'Gratuitos' },
          { id: 'cursos', label: 'Cursos' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFiltroAtivo(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filtroAtivo === tab.id 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabela de Gestão */}
      {loading && planos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2 text-tvde-primary" size={36} />
          <p className="text-xs sm:text-sm font-semibold">A carregar serviços registados...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4">Nome do Serviço</th>
                <th className="p-4">Destinatário</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Caraterísticas</th>
                <th className="p-4 text-center">Preço</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs sm:text-sm text-slate-700">
              {planosFiltrados.length > 0 ? (
                planosFiltrados.map((plano) => (
                  <tr key={plano.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{plano.nome}</td>
                    
                    {/* Destinatário */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase border ${
                        plano.destinatario === 'proprietario'
                          ? 'bg-purple-50 text-purple-600 border-purple-100'
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {plano.destinatario === 'proprietario' ? <Building2 size={10} /> : <User size={10} />}
                        {plano.destinatario}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                        plano.tipo === 'pacote' 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {plano.tipo}
                      </span>
                    </td>

                    {/* Tags / Caraterísticas */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {plano.isGratuito && (
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Gratuito</span>
                        )}
                        {plano.isCurso && (
                          <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Curso</span>
                        )}
                        {plano.linkExterno && (
                          <span className="bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-0.5">
                            <Link2 size={8} /> Link
                          </span>
                        )}
                        {!plano.isGratuito && !plano.isCurso && !plano.linkExterno && (
                          <span className="bg-slate-50 text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">Geral</span>
                        )}
                      </div>
                    </td>

                    {/* Preço */}
                    <td className="p-4 text-center font-black text-slate-800">
                      {plano.isGratuito || plano.preco === 0 ? (
                        <span className="text-emerald-600 font-extrabold uppercase text-[10px]">Grátis</span>
                      ) : (
                        formatCurrency(plano.preco)
                      )}
                    </td>

                    {/* Estado */}
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                        plano.ativo !== false 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {plano.ativo !== false ? <Eye size={10} /> : <EyeOff size={10} />}
                        {plano.ativo !== false ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleEditClick(plano)}
                        className="p-2 text-slate-400 hover:text-tvde-primary bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 italic">
                    Nenhum serviço ou plano encontrado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Wizard Interativo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlano ? "Editar Configurações do Serviço" : `Criar Novo Serviço - Etapa ${passo} de 3`}
      >
        <div className="space-y-4 text-left">
          
          {/* PASSO 1: Destinatário */}
          {passo === 1 && (
            <div className="space-y-4 py-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider text-center">A quem se destina este serviço?</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, destinatario: 'motorista' });
                    setPasso(2);
                  }}
                  className="p-6 border border-slate-200 hover:border-tvde-primary hover:bg-blue-50/30 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-tvde-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <User size={24} />
                  </div>
                  <span className="font-bold text-sm text-slate-800">🙋‍♂️ Motorista</span>
                  <span className="text-[10px] text-slate-400 text-center leading-relaxed">Legalização, cursos, dísticos e ativação de contas.</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, destinatario: 'proprietario' });
                    setPasso(2);
                  }}
                  className="p-6 border border-slate-200 hover:border-tvde-primary hover:bg-purple-50/30 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 size={24} />
                  </div>
                  <span className="font-bold text-sm text-slate-800">🏢 Proprietário</span>
                  <span className="text-[10px] text-slate-400 text-center leading-relaxed">Licenciamento de viaturas e consultoria de frotas.</span>
                </button>
              </div>
            </div>
          )}

          {/* PASSO 2: Tipo de Serviço */}
          {passo === 2 && (
            <div className="space-y-4 py-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider text-center">Qual o formato do serviço?</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, tipo: 'avulso' });
                    setPasso(3);
                  }}
                  className="p-6 border border-slate-200 hover:border-tvde-primary hover:bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText size={24} />
                  </div>
                  <span className="font-bold text-sm text-slate-800">⚙️ Serviço Avulso</span>
                  <span className="text-[10px] text-slate-400 text-center leading-relaxed">Ação pontual, formulário único ou submissão isolada.</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, tipo: 'pacote' });
                    setPasso(3);
                  }}
                  className="p-6 border border-slate-200 hover:border-tvde-primary hover:bg-amber-50/30 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Layers size={24} />
                  </div>
                  <span className="font-bold text-sm text-slate-800">📦 Pacote Completo</span>
                  <span className="text-[10px] text-slate-400 text-center leading-relaxed">Agrupamento composto de vários serviços individuais.</span>
                </button>
              </div>
              <button 
                type="button" 
                onClick={() => setPasso(1)} 
                className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto mt-4 cursor-pointer"
              >
                <ChevronLeft size={16} /> Voltar ao destinatário
              </button>
            </div>
          )}

          {/* PASSO 3: Formulário Geral */}
          {passo === 3 && (
            <form onSubmit={handleSave} className="space-y-4 animate-in fade-in duration-200">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Nome do Serviço / Pacote *</label>
                  <input required className={inputClass} value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} placeholder="Ex: Chave na Mão, Registo de Atividade..." />
                </div>

                {/* Tags de Classificação Auxiliares */}
                <div className="flex items-center gap-4 py-2 col-span-1 md:col-span-2 border-b border-slate-50">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="accent-tvde-primary w-4 h-4" 
                      checked={formData.isGratuito} 
                      onChange={(e) => setFormData({ ...formData, isGratuito: e.target.checked, preco: e.target.checked ? '0' : formData.preco })} 
                    />
                    🎁 É gratuito?
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="accent-tvde-primary w-4 h-4" 
                      checked={formData.isCurso} 
                      onChange={(e) => setFormData({ ...formData, isCurso: e.target.checked })} 
                    />
                    🎓 É um Curso/Formação?
                  </label>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Público-Alvo</label>
                  <select className={inputClass} value={formData.destinatario} onChange={(e) => setFormData({...formData, destinatario: e.target.value})}>
                    <option value="motorista">🙋‍♂️ Motorista</option>
                    <option value="proprietario">🏢 Proprietário</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Preço do Serviço (€) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      required 
                      disabled={formData.isGratuito}
                      type="number" 
                      step="0.01" 
                      className={`${inputClass} pl-6 disabled:bg-slate-50 disabled:text-slate-400`} 
                      value={formData.isGratuito ? '0' : formData.preco} 
                      onChange={(e) => setFormData({...formData, preco: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Descrição Comercial</label>
                  <textarea className={`${inputClass} h-20 resize-none`} value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} placeholder="Descreva de forma clara os benefícios, suporte técnico e acompanhamento regulamentar incluídos neste serviço..." />
                </div>

                {/* Campo opcional para Link Externo/Redirecionamento */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Link de Redirecionamento / Página Especial (Opcional)</label>
                  <div className="relative">
                    <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      className={`${inputClass} pl-8`} 
                      value={formData.linkExterno} 
                      onChange={(e) => setFormData({...formData, linkExterno: e.target.value})} 
                      placeholder="Ex: /gerador-distico ou https://link.com (Redireciona em vez de abrir modal de lead)" 
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 ml-1 mt-1 block">
                    Se preenchido, ao selecionar este serviço na Landing Page o utilizador será enviado diretamente para esta rota em vez de captar lead no modal.
                  </span>
                </div>

                {/* Seleção de Itens para Pacotes */}
                {formData.tipo === 'pacote' && (
                  <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">
                      Serviços Avulsos Associados ao Pacote:
                    </label>
                    {planos.filter(p => p.tipo === 'avulso').length === 0 ? (
                      <p className="text-xs text-slate-400 italic ml-1">Nenhum serviço avulso ativo para associar.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[130px] overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50/50 custom-scrollbar">
                        {planos
                          .filter(p => p.tipo === 'avulso')
                          .map((avulso) => {
                            const isChecked = formData.itens?.includes(avulso.id) || false;
                            return (
                              <label 
                                key={avulso.id} 
                                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-xs font-semibold select-none ${
                                  isChecked 
                                    ? 'border-blue-200 bg-blue-50/50 text-blue-700 font-bold' 
                                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                                }`}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  className="accent-blue-600 shrink-0 w-3.5 h-3.5"
                                  onChange={(e) => {
                                    const currentItens = formData.itens || [];
                                    const nextItens = e.target.checked
                                      ? [...currentItens, avulso.id]
                                      : currentItens.filter(id => id !== avulso.id);
                                    setFormData({ ...formData, itens: nextItens });
                                  }}
                                />
                                <span className="truncate flex-1 text-left">{avulso.nome}</span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                                  {avulso.isGratuito ? '0€' : formatCurrency(avulso.preco)}
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Publicação na Landing Page</label>
                  <select className={inputClass} value={formData.ativo} onChange={(e) => setFormData({...formData, ativo: e.target.value === 'true'})}>
                    <option value="true">Visível (Ativo)</option>
                    <option value="false">Oculto (Inativo)</option>
                  </select>
                </div>
              </div>

              {/* Botões de Ação do Passo 3 */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                {!editingPlano && (
                  <Button variant="secondary" className="h-10 text-xs w-fit" onClick={() => setPasso(2)}>
                    <ChevronLeft size={16} /> Voltar ao Tipo
                  </Button>
                )}
                <Button variant="secondary" className="flex-1 h-10 text-xs" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 h-10 text-xs shadow-md">
                  Guardar Definições
                </Button>
              </div>

            </form>
          )}

        </div>
      </Modal>
    </div>
  );
}