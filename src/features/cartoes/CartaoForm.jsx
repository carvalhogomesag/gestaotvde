import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';

export default function CartaoForm({ onSubmit, initialData = {}, veiculos = [], onCancel }) {
  // Estado inicial que lê de forma defensiva ambas as nomenclaturas existentes na BD (numero/numeroCartao e pin/PIN)
  const [formData, setFormData] = useState({
    fornecedor: initialData.fornecedor || '',
    numero: initialData.numero || initialData.numeroCartao || '',
    pin: initialData.pin || initialData.PIN || '',
    plafond: initialData.plafond || '',
    veiculoId: initialData.veiculoId || '',
    veiculoMatricula: initialData.veiculoMatricula || '',
    tipo: initialData.tipo || 'combustivel' // ou 'eletrico'
  });

  // Garante a re-sincronização do estado caso o formulário mude de dados em edição
  useEffect(() => {
    setFormData({
      fornecedor: initialData.fornecedor || '',
      numero: initialData.numero || initialData.numeroCartao || '',
      pin: initialData.pin || initialData.PIN || '',
      plafond: initialData.plafond || '',
      veiculoId: initialData.veiculoId || '',
      veiculoMatricula: initialData.veiculoMatricula || '',
      tipo: initialData.tipo || 'combustivel'
    });
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const valorLimpo = formData.numero.trim();

    // Sincroniza ambos os campos de dados na submissão ao componente pai
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
        <input required className="w-full p-2 border border-slate-200 rounded-lg"
          value={formData.fornecedor} onChange={(e) => setFormData({...formData, fornecedor: e.target.value})} />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Número do Cartão (Identificador)</label>
        <input required className="w-full p-2 border border-slate-200 rounded-lg font-mono"
          value={formData.numero} onChange={(e) => setFormData({...formData, numero: e.target.value})} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">PIN / Senha</label>
          <input required className="w-full p-2 border border-slate-200 rounded-lg font-bold text-tvde-primary"
            value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Plafond Semanal (€)</label>
          <input type="number" required className="w-full p-2 border border-slate-200 rounded-lg"
            value={formData.plafond} onChange={(e) => setFormData({...formData, plafond: e.target.value})} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Atribuído ao Veículo</label>
        <select 
          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
          value={formData.veiculoId}
          onChange={(e) => {
            const v = veiculos.find(v => v.id === e.target.value);
            setFormData({...formData, veiculoId: e.target.value, veiculoMatricula: v ? v.matricula : ''});
          }}
        >
          <option value="">Cartão em Stock (Não atribuído)</option>
          {veiculos.map(v => (
            <option key={v.id} value={v.id}>{v.matricula} - {v.marca}</option>
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