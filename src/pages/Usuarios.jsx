import React, { useState, useEffect } from 'react';
import { Plus, Users, ShieldCheck, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import UsuarioForm from '../features/usuarios/UsuarioForm';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query } from 'firebase/firestore';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchUsuarios = async () => {
    const snap = await getDocs(query(collection(db, "usuarios")));
    setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const handleCreateUser = async (dados) => {
    // Nota: Aqui futuramente integraremos com Firebase Auth
    // Por agora, guardamos apenas o perfil no Firestore
    await addDoc(collection(db, "usuarios"), dados);
    setIsModalOpen(false);
    fetchUsuarios();
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Utilizadores e Permissões</h1>
          <p className="text-slate-500 text-sm">Controle quem acede ao sistema e o que podem ver.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Novo Utilizador
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usuarios.map(u => (
          <div key={u.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-800">{u.nome}</p>
                <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 rounded-md text-slate-500 mt-1 inline-block">
                  {u.role}
                </span>
              </div>
            </div>
            <button className="text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Conceder Novo Acesso">
        <UsuarioForm onSubmit={handleCreateUser} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}