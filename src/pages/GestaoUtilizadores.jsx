import React, { useState, useEffect } from 'react';
import { 
  UserPlus, ShieldCheck, Mail, Trash2, 
  Search, Lock, MoreVertical, Edit2, 
  CheckCircle2, XCircle, Loader2 
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { logAcaoGlobal } from '../utils/logger';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import UsuarioForm from '../features/usuarios/UsuarioForm';

export default function GestaoUtilizadores() {
  const { userData } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "usuarios"), orderBy("nome", "asc"));
      const snap = await getDocs(q);
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Erro ao carregar utilizadores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.role === 'admin') fetchUsuarios();
  }, [userData]);

  const handleSaveUser = async (dados) => {
    try {
      // O ID será o email (limpo) para facilitar a gestão
      const userId = editingUser?.id || dados.email.toLowerCase().replace(/\./g, '_');
      
      const userRef = doc(db, "usuarios", userId);
      await setDoc(userRef, {
        ...dados,
        email: dados.email.toLowerCase(),
        dataAtualizacao: new Date().toISOString(),
        atualizadoPor: userData?.nome
      }, { merge: true });

      await logAcaoGlobal(
        userData?.nome, 
        editingUser ? "Edição de Permissões" : "Criação de Perfil", 
        "Utilizadores", 
        dados.nome, 
        userId
      );

      setIsModalOpen(false);
      setEditingUser(null);
      fetchUsuarios();
      alert(editingUser ? "Acesso atualizado!" : "Perfil de acesso criado com sucesso!");
    } catch (error) {
      alert("Erro ao salvar utilizador.");
    }
  };

  const handleDelete = async (user) => {
    if (user.role === 'admin' && usuarios.filter(u => u.role === 'admin').length === 1) {
      return alert("Não pode eliminar o único administrador do sistema.");
    }

    if (window.confirm(`Remover permanentemente o acesso de ${user.nome}?`)) {
      await deleteDoc(doc(db, "usuarios", user.id));
      await logAcaoGlobal(userData?.nome, "Eliminação de Acesso", "Utilizadores", user.nome, user.id);
      fetchUsuarios();
    }
  };

  const filteredUsers = usuarios.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (userData?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito ao Diretor</h2>
        <p className="text-slate-500 mt-2">Apenas o administrador principal pode gerir a equipa e acessos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <ShieldCheck className="text-tvde-primary" /> Gestão de Equipa
          </h1>
          <p className="text-slate-500 text-sm">Controle os níveis de acesso e permissões de cada colaborador.</p>
        </div>
        <Button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="shadow-lg shadow-blue-500/20">
          <UserPlus size={20} /> Conceder Novo Acesso
        </Button>
      </header>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Procurar por nome ou email..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-tvde-primary/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LISTA DE UTILIZADORES */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-300" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(u => (
            <div key={u.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative group overflow-hidden">
              {/* Badge de Role */}
              <div className={`absolute top-0 right-0 px-6 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${
                u.role === 'admin' ? 'bg-red-500 text-white' : 'bg-tvde-primary text-white'
              }`}>
                {u.role}
              </div>

              <div className="flex items-start gap-4 mb-6 pt-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner ${
                  u.role === 'admin' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                }`}>
                  {u.nome[0].toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-slate-800 truncate">{u.nome}</h3>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Mail size={12} />
                    <span className="text-xs truncate">{u.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  {u.status === 'ativo' ? (
                    <span className="flex items-center gap-1 text-[10px] font-black text-green-500 uppercase">
                      <CheckCircle2 size={12} /> Ativo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-black text-slate-300 uppercase">
                      <XCircle size={12} /> Inativo
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingUser(u); setIsModalOpen(true); }}
                    className="p-2 bg-slate-50 text-slate-400 hover:text-tvde-primary hover:bg-blue-50 rounded-xl transition-all"
                    title="Editar Permissões"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(u)}
                    className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Remover Acesso"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <p className="text-slate-400 font-medium">Nenhum utilizador encontrado.</p>
            </div>
          )}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingUser ? "Editar Permissões" : "Conceder Novo Acesso"}
      >
        <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <p className="text-xs text-blue-700 leading-relaxed">
            <strong>Nota Importante:</strong> Ao salvar aqui, você define o que o utilizador pode ver. 
            Certifique-se de que o email inserido existe no <u>Firebase Authentication</u> para que o login funcione.
          </p>
        </div>
        <UsuarioForm 
          onSubmit={handleSaveUser} 
          onCancel={() => setIsModalOpen(false)} 
          initialData={editingUser || {}} 
        />
      </Modal>
    </div>
  );
}