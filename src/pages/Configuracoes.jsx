import React, { useState, useEffect } from 'react';
import { Plus, ShieldCheck, Trash2, Settings, Lock, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, deleteDoc, setDoc, query } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import UsuarioForm from '../features/usuarios/UsuarioForm';

export default function Configuracoes() {
  const { userData, loading: authLoading } = useAuth(); // Pegamos o loading do contexto
  const [usuarios, setUsuarios] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsuarios = async () => {
    setLoadingData(true);
    try {
      const snap = await getDocs(query(collection(db, "usuarios")));
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Erro ao carregar utilizadores:", error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    // Só tenta carregar se o utilizador for admin
    if (userData?.role === 'admin') {
      fetchUsuarios();
    }
  }, [userData]);

  const handleSaveUser = async (dados) => {
    try {
      // Usamos o email como ID (limpo de pontos) ou o ID existente
      const userId = editingUser?.id || dados.email.replace(/\./g, '_');
      await setDoc(doc(db, "usuarios", userId), dados, { merge: true });
      setIsModalOpen(false);
      setEditingUser(null);
      fetchUsuarios();
    } catch (error) {
      alert("Erro ao salvar permissões.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remover acesso deste utilizador?")) {
      try {
        await deleteDoc(doc(db, "usuarios", id));
        fetchUsuarios();
      } catch (error) {
        alert("Erro ao eliminar.");
      }
    }
  };

  // 1. Enquanto o Firebase está a verificar quem você é
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-tvde-primary" size={40} />
      </div>
    );
  }

  // 2. Se já carregou e você NÃO é admin
  if (userData?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500">Apenas administradores podem gerir utilizadores.</p>
        <p className="text-xs text-slate-400 mt-2">O seu cargo atual é: <span className="font-bold">{userData?.role || 'Não definido'}</span></p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-tvde-primary" /> Configurações
          </h1>
          <p className="text-slate-500 text-sm">Gestão de acessos ao sistema.</p>
        </div>
        <Button onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>
          <Plus size={20} /> Novo Utilizador
        </Button>
      </header>

      {loadingData ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-300" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usuarios.map(u => (
            <div key={u.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all relative group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                  <ShieldCheck size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-tvde-primary bg-slate-50 rounded-lg">
                    <Settings size={16} />
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 text-lg">{u.nome}</h3>
                <p className="text-sm text-slate-500 truncate">{u.email}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                    {u.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingUser ? "Editar Permissões" : "Conceder Novo Acesso"}
      >
        <UsuarioForm 
          onSubmit={handleSaveUser} 
          onCancel={() => setIsModalOpen(false)} 
          initialData={editingUser || {}} 
        />
      </Modal>
    </div>
  );
}