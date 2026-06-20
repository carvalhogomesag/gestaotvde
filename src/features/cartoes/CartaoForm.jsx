import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';

/**
 * Função Auxiliar: Formata o nome em Title Case para exibição 
 * uniforme no select de motoristas.
 */
const formatTitleCase = (str) => {
  if (!str) return '';
  const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'em'];
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (preposicoes.includes(word) && index !== 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export default function CartaoForm({ onSubmit, initialData = {}, motoristas = [], onCancel }) {
  // Estado inicial lê de forma defensiva e mapeia para a nova relação com Motoristas [1]
  const [formData, setFormData] = useState({
    fornecedor: initialData.fornecedor || '',
    numero: initialData.numero || initialData.numeroCartao || '',
    pin: initialData.pin || initialData.PIN || '',
    plafond: initialData.plafond || '',
    motoristaId: initialData.motoristaId || '',
    motoristaNome: initialData.motoristaNome || '',
    tipo: initialData.tipo || 'combustivel' // ou 'eletrico'
  });

  // Garante a re-sincronização do estado caso o formulário mude de dados em edição
  useEffect(() => {
    setFormData({
      fornecedor: initialData.fornecedor || '',
      numero: initialData.numero || initialData.numeroCartao || '',
      pin: initialData.pin || initialData.PIN || '',
      plafond: initialData.plafond || '',
      motoristaId: initialData.motoristaId || '',
      motoristaNome: initialData.motoristaNome || '',
      tipo: initialData.tipo || 'combustivel'
    });
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const valorLimpo = formData.numero.trim();

    // Sincroniza ambos os campos de dados na submissão ao componente pai [1]
    onSubmit({
      ...formData,
      numero: valorLimpo,
      numeroCartao: valorLimpo,
      pin: formData.pin,
      PIN: formData.pin // Preserva as duas variações de propriedades para segurança estrutural
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Fornecedor (Ex: Prio, Galp, MiiO)</label>
        <input required className="w-full p-2 border border-slate-200 rounded-lg text-xs"
          value={formData.fornecedor} onChange={(e) => setFormData({...formData, fornecedor: e.target.value})} />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Número do Cartão (Identificador)</label>
        <input required className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs"
          value={formData.numero} onChange={(e) => setFormData({...formData, numero: e.target.value})} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">PIN / Senha</label>
          <input required className="w-full p-2 border border-slate-200 rounded-lg font-bold text-tvde-primary text-xs"
            value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Plafond Semanal (€)</label>
          <input type="number" required className="w-full p-2 border border-slate-200 rounded-lg text-xs"
            value={formData.plafond} onChange={(e) => setFormData({...formData, plafond: e.target.value})} />
        </div>
      </div>

      {/* ◄ ALTERADO: Atribuição direta ao Motorista em vez de Veículo */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Atribuído ao Motorista</label>
        <select 
          className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs"
          value={formData.motoristaId}
          onChange={(e) => {
            const m = motoristas.find(m => m.id === e.target.value);
            setFormData({
              ...formData, 
              motoristaId: e.target.value, 
              motoristaNome: m ? m.nome : ''
            });
          }}
        >
          <option value="">Cartão em Stock (Não atribuído)</option>
          {motoristas.map(m => (
            <option key={m.id} value={m.id}>{formatTitleCase(m.nome)}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="flex-1">Guardar Cartão</Button>
      </div>
    </form>
  );
}