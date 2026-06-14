/**
 * ServicosConfig.jsx
 * Localização: src/pages/ServicosConfig.jsx
 *
 * Página de parametrização e preços de planos e serviços de assessoria.
 * Reservado exclusivamente para Administradores (Diretores).
 * Totalmente responsiva com suporte a listagem horizontal rolável e modal de edição.
 */

import React, { useState, useEffect } from 'react';
import { Sliders, Plus, Edit, Loader2, Lock, CheckCircle2, DollarSign, Layers } from 'lucide-react';
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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'pacote', // pacote | avulso
    preco: '',
    descricao: '',
    ativo: true
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const dados = await obterPlanosAssessoria(db);
      setPlanos(dados);
    } catch (error) {
      console.error('[ServicosConfig] Erro ao carregar planos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.role === 'admin') {
      carregarDados();
    }
  }, [userData]);

  // BLOQUEIO DE SEGURANÇA: Se não for administrador, barra o acesso
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

  const handleEditClick = (plano) => {
    setEditingPlano(plano);
    setFormData({
      nome: plano.nome || '',
      tipo: plano.tipo || 'pacote',
      preco: plano.preco || '',
      descricao: plano.descricao || '',
      ativo: plano.ativo ?? true
    });
    setIsModalOpen(true);
  };

  const handleNovoClick = () => {
    setEditingPlano(null);
    setFormData({
      nome: '',
      tipo: 'avulso',
      preco: '',
      descricao: '',
      ativo: true
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const operador = userData?.nome || 'Diretor';
      // Se não for edição, cria um ID/slug baseado no nome
      const idDoc = editingPlano 
        ? editingPlano.id 
        : 's-' + formData.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const dadosParaGravar = {
        ...formData,
        preco: Number(formData.preco || 0),
        id: idDoc,
        atualizadoEm: new Date().toISOString()
      };

      await setDoc(doc(db, 'servicos_assessoria', idDoc), dadosParaGravar);

      await logAcaoGlobal(
        operador,
        editingPlano ? 'Edição Preço' : 'Criação Serviço',
        'Configurações',
        `${editingPlano ? 'Atualizou' : 'Criou'} o serviço/plano: ${formData.nome} para o valor de ${formData.preco}€`,
        idDoc
      );

      setIsModalOpen(false);
      await carregarDados();
    } catch (error) {
      console.error('[ServicosConfig] Erro ao gravar plano:', error);
      alert('Erro ao gravar o serviço de assessoria.');
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
            Planos & Preços de Assessoria
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">Parametrização dos pacotes e serviços de apoio documentais.</p>
        </div>
        <Button 
          onClick={handleNovoClick}
          className="w-full sm:w-auto justify-center text-xs sm:text-sm h-10"
        >
          <Plus size={18} /> Novo Serviço / Plano
        </Button>
      </header>

      {/* Tabela de Gestão de Preços (Com scroll lateral de segurança contra quebras no mobile) */}
      {loading && planos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2 text-tvde-primary" size={36} />
          <p className="text-xs sm:text-sm font-semibold">A carregar tabela de preços...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4">Nome do Serviço / Pacote</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Descrição</th>
                <th className="p-4 text-center">Preço</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs sm:text-sm text-slate-700">
              {planos.map((plano) => (
                <tr key={plano.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Nome */}
                  <td className="p-4 font-bold text-slate-800">{plano.nome}</td>
                  
                  {/* Tipo */}
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${
                      plano.tipo === 'pacote' 
                        ? 'bg-blue-50 text-blue-600 border-blue-100' 
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {plano.tipo}
                    </span>
                  </td>

                  {/* Descrição */}
                  <td className="p-4 max-w-[220px] text-slate-400 leading-relaxed truncate" title={plano.descricao}>
                    {plano.descricao || 'Sem descrição cadastrada.'}
                  </td>

                  {/* Preço */}
                  <td className="p-4 text-center font-black text-tvde-primary">
                    {formatCurrency(plano.preco)}
                  </td>

                  {/* Estado (Ativo/Inativo) */}
                  <td className="p-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                      plano.ativo !== false 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {plano.ativo !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleEditClick(plano)}
                      className="p-2 text-slate-400 hover:text-tvde-primary bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar preço e descrição"
                    >
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal responsivo de Edição/Criação */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlano ? "Editar Configurações de Serviço" : "Criar Novo Plano / Serviço"}
      >
        <form onSubmit={handleSave} className="space-y-4 text-left">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Nome do Plano ou Serviço *</label>
              <input required className={inputClass} value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
            </div>
            
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Tipo de Serviço</label>
              <select className={inputClass} value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                <option value="pacote">📦 Pacote de Assessoria Completo</option>
                <option value="avulso">⚙️ Serviço Avulso / Individual</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Preço do Plano (€) *</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input required type="number" step="0.01" className={`${inputClass} pl-6`} value={formData.preco} onChange={(e) => setFormData({...formData, preco: e.target.value})} />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Descrição Explicativa</label>
              <textarea className={`${inputClass} h-20 resize-none`} value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} placeholder="Escreva aqui os detalhes de cobertura e suporte incluídos neste serviço..." />
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Estado de Venda</label>
              <select className={inputClass} value={formData.ativo} onChange={(e) => setFormData({...formData, ativo: e.target.value === 'true'})}>
                <option value="true">Disponível para venda (Ativo)</option>
                <option value="false">Pausado (Inativo)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
            <Button variant="secondary" className="flex-1 h-10 text-xs" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 h-10 text-xs shadow-md">
              Guardar Definições
            </Button>
          </div>

        </form>
      </Modal>
    </div>
  );
}