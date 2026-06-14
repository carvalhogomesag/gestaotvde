/**
 * Assessorados.jsx
 * Localização: src/pages/Assessorados.jsx
 *
 * Página de controlo do ERP para gestão de clientes em assessoria TVDE.
 * Totalmente responsiva com suporte a listagem horizontal rolável, modal do formulário
 * e sistema de auditoria transacional nativo.
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Loader2, BookOpen } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import AssessoradosList from '../features/assessorados/AssessoradosList';
import AssessoradoForm from '../features/assessorados/AssessoradoForm';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { 
  obterAssessorados, 
  obterPlanosAssessoria, 
  criarAssessorado, 
  atualizarAssessorado 
} from '../services/assessoriaService';

export default function Assessorados() {
  const { userData } = useAuth();
  const [assessorados, setAssessorados] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Carrega os dados agregados da assessoria e serviços
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [dadosAssessorados, dadosPlanos] = await Promise.all([
        obterAssessorados(db),
        obterPlanosAssessoria(db)
      ]);
      setAssessorados(dadosAssessorados);
      setPlanos(dadosPlanos);
    } catch (error) {
      console.error('[Assessorados] Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Gravação ou Edição de registos com auditoria integrada
  const handleSaveAssessorado = async (dados) => {
    const operador = userData?.nome || 'Sistema';
    try {
      setLoading(true);
      if (editingId) {
        // Padrão de segurança leve: Solicitação de justificação nativa via prompt
        const motivo = window.prompt("Indique o motivo desta alteração para os registos de auditoria:");
        if (motivo === null) {
          setLoading(false);
          return; // Cancelou a edição
        }
        await atualizarAssessorado(db, editingId, dados, operador, motivo || 'Atualização de dados cadastrais.');
      } else {
        await criarAssessorado(db, dados, operador);
      }
      fecharModal();
      await carregarDados();
    } catch (error) {
      alert('Erro ao gravar os dados do assessorado.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (assessorado, viewOnly = false) => {
    setEditingId(assessorado.id);
    setIsViewOnly(viewOnly);
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setIsViewOnly(false);
  };

  // Filtragem de dados em tempo real (CRM Search)
  const assessoradosFiltrados = assessorados.filter(a => {
    const busca = searchTerm.toLowerCase();
    return (
      (a.nome || '').toLowerCase().includes(busca) ||
      (a.codigoInterno || '').toLowerCase().includes(busca) ||
      (a.telemovel || '').includes(busca) ||
      (a.nif || '').includes(busca)
    );
  });

  const assessoradoEmEdicao = assessorados.find(a => a.id === editingId) || null;

  return (
    <div className="space-y-6">
      {/* Header Responsivo (Empilha em mobile) */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 leading-tight">
            <BookOpen className="text-tvde-primary shrink-0" size={24} />
            Assessoria de Clientes
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">Gestão de novos condutores em processo regulatório.</p>
        </div>
        <Button 
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="w-full sm:w-auto justify-center text-xs sm:text-sm h-10"
        >
          <Plus size={18} /> Novo Assessorado
        </Button>
      </header>

      {/* Barra de Pesquisa */}
      <div className="flex gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Procurar assessorado por nome, código, nif..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-tvde-primary/20 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Listagem com barreira de segurança responsiva contra estouros de ecrã */}
      {loading && assessorados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2 text-tvde-primary" size={36} />
          <p className="text-xs sm:text-sm font-semibold">A carregar registos de assessoria...</p>
        </div>
      ) : (
        /* Envoltório responsivo para garantir legibilidade da tabela em mobile */
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-white">
          <AssessoradosList 
            assessorados={assessoradosFiltrados}
            onEdit={handleEditClick}
          />
        </div>
      )}

      {/* Modal responsivo do Formulário (Abre gaveta em mobile e popup central no PC) */}
      <Modal
        isOpen={isModalOpen}
        onClose={fecharModal}
        title={isViewOnly ? "Ficha do Assessorado" : (editingId ? "Editar Assessorado" : "Novo Registo de Assessoria")}
      >
        <AssessoradoForm
          onSubmit={handleSaveAssessorado}
          onCancel={fecharModal}
          initialData={assessoradoEmEdicao || {}}
          planos={planos}
          isReadOnly={isViewOnly}
        />
      </Modal>
    </div>
  );
}