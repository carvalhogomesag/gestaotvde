import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import { ShieldCheck, Mail, User, Tag } from 'lucide-react';

export default function UsuarioForm({ onSubmit, onCancel, initialData = {} }) {
  const [formData, setFormData] = useState({
    nome: initialData.nome || '',
    email: initialData.email || '',
    role: initialData.role || 'motorista',
    status: initialData.status || 'ativo'
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Nome Completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input required className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl bg-slate-50/30 outline-none focus:ring-2 focus:ring-tvde-primary/20"
              value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Nível de Acesso</label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-tvde-primary/20 appearance-none"
              value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
              <option value="admin">Administrador (Total)</option>
              <option value="staff">Staff Interno (Gestão)</option>
              <option value="motorista">Motorista (Acesso Próprio)</option>
              <option value="parceiro">Parceiro Externo (Consulta)</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Email de Login</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="email" required className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl bg-slate-50/30 outline-none focus:ring-2 focus:ring-tvde-primary/20"
            value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
        </div>
        <p className="text-[10px] text-slate-400 mt-2 italic">
          * Certifique-se de que este email já foi criado na aba "Authentication" do Console Firebase.
        </p>
      </div>

      <div className="flex gap-4 pt-4 border-t border-slate-50">
        <Button variant="secondary" className="flex-1 h-12" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="flex-1 h-12 shadow-lg shadow-blue-500/20">Salvar Permissões</Button>
      </div>
    </form>
  );
}