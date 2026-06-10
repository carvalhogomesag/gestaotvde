import React, { useState } from 'react';
import Button from '../../components/ui/Button';

export default function CartaoForm({ onSubmit, initialData = {}, veiculos = [], onCancel }) {
  const [formData, setFormData] = useState({
    fornecedor: initialData.fornecedor || '',
    numero: initialData.numero || '',
    pin: initialData.pin || '',
    plafond: initialData.plafond || '',
    veiculoId: initialData.veiculoId || '',
    veiculoMatricula: initialData.veiculoMatricula || '',
    tipo: initialData.tipo || 'combustivel' // ou 'eletrico'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Fornecedor (Ex: Prio, Galp, MiiO)</label>
        <input required className="w-full p-2 border border-slate-200 rounded-lg"
          value={formData.fornecedor} onChange={(e) => setFormData({...formData, fornecedor: e.target.value})} />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Número do Cartão</label>
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