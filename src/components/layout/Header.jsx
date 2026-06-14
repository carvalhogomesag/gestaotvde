/**
 * Header.jsx
 * Localização: src/components/layout/Header.jsx
 *
 * Cabeçalho administrativo do ERP.
 * Atualizado com:
 * - Botão de menu hambúrguer para mobile (lg:hidden)
 * - Paddings fluidos e adaptabilidade a ecrãs reduzidos
 */

import React, { useState, useEffect, useRef } from 'react';
import GlobalSearch from './GlobalSearch';
import { Bell, User, Clock, ArrowRight, Inbox, AlertCircle, Menu } from 'lucide-react'; // ◄ Importado ícone Menu
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Header({ setSidebarAberta }) { // ◄ Recebe a prop de controlo responsivo
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasUnseenAlert, setHasUnseenAlert] = useState(false);
  const dropdownRef = useRef(null);

  // Função para pegar as iniciais do nome
  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  /**
   * ESCUTA ATIVA DE TAREFAS (Real-time Notifications)
   */
  useEffect(() => {
    if (!userData?.nome) return;

    const q = query(
      collection(db, "tickets"),
      where("atribuidoA", "==", userData.nome),
      where("status", "==", "pendente"),
      orderBy("dataCriacao", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Lógica de Alerta Visual (Badge Vermelho)
      if (tasks.length > 0) {
        const lastSeenId = localStorage.getItem(`lastSeenTicket_${userData.nome}`);
        const newestTicketId = tasks[0].id;

        if (lastSeenId !== newestTicketId) {
          setHasUnseenAlert(true);
        }
      } else {
        setHasUnseenAlert(false);
      }
      
      setNotifications(tasks);
    });

    return () => unsubscribe();
  }, [userData?.nome]);

  /**
   * Ação ao clicar no sino: Limpa o alerta vermelho mas mantém o contador
   */
  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
    if (notifications.length > 0) {
      setHasUnseenAlert(false);
      localStorage.setItem(`lastSeenTicket_${userData.nome}`, notifications[0].id);
    }
  };

  /**
   * Fecha o dropdown ao clicar fora e limpa o listener corretamente
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    // ◄ ALTERADO: Padding fluido (px-4 no telemóvel, px-8 no computador)
    <header className="h-20 flex items-center justify-between px-4 sm:px-8 bg-tvde-bg/80 backdrop-blur-md sticky top-0 z-30">
      
      {/* ◄ ALTERADO: Contentor flexível para agrupar o botão hambúrguer mobile e a barra de pesquisa */}
      <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
        {/* Botão Hambúrguer — Visível apenas em ecrãs Mobile/Tablet */}
        <button
          type="button"
          onClick={() => setSidebarAberta(true)}
          className="lg:hidden p-2 text-slate-500 hover:text-tvde-primary hover:bg-white rounded-xl transition-all cursor-pointer shrink-0"
          aria-label="Abrir menu lateral"
        >
          <Menu size={20} />
        </button>
        
        <GlobalSearch />
      </div>
      
      <div className="flex items-center gap-4 shrink-0">
        
        {/* SLOT DA SALA DE COMANDO IA */}
        <div id="navbar-slot-ia" className="flex items-center mr-2"></div>

        {/* CENTRO DE NOTIFICAÇÕES */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleBellClick}
            className={`p-2.5 rounded-xl transition-all relative ${
              showDropdown || hasUnseenAlert 
              ? 'bg-white text-tvde-primary shadow-sm' 
              : 'text-slate-400 hover:text-tvde-primary hover:bg-white'
            }`}
          >
            <Bell size={20} />
            
            {/* BADGE DINÂMICO */}
            {notifications.length > 0 && (
              <span className={`absolute top-2 right-2 w-4 h-4 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center transition-all duration-500 ${
                hasUnseenAlert 
                ? 'bg-red-500 animate-bounce' 
                : 'bg-slate-400' 
              }`}>
                {notifications.length}
              </span>
            )}
          </button>

          {/* DROPDOWN DE NOTIFICAÇÕES */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">Notificações</h3>
                <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase">
                  {notifications.length} Pendentes
                </span>
              </div>

              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        navigate(`/tarefas`);
                        setShowDropdown(false);
                      }}
                      className="w-full p-4 hover:bg-slate-50 border-b border-slate-50 text-left transition-colors flex gap-3 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-tvde-primary flex items-center justify-center flex-shrink-0 group-hover:bg-tvde-primary group-hover:text-white transition-colors">
                        <Inbox size={18} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {task.vinculoNome || "Tarefa"}
                        </p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {task.nota || "Ação necessária neste registo."}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                          <Clock size={10} />
                          <span>{new Date(task.dataCriacao).toLocaleDateString('pt-PT')}</span>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-200 group-hover:text-tvde-primary self-center" />
                    </button>
                  ))
                ) : (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle size={24} />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Tudo em dia!</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => { navigate('/tarefas'); setShowDropdown(false); }}
                className="w-full p-3 text-center text-xs font-black text-tvde-primary hover:bg-slate-50 transition-colors uppercase tracking-widest border-t border-slate-100"
              >
                Ir para Minhas Tarefas
              </button>
            </div>
          )}
        </div>
        
        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800">{userData?.nome || user?.email}</p>
            <p className="text-[10px] text-tvde-primary font-black uppercase tracking-tighter">{userData?.role || 'Utilizador'}</p>
          </div>
          <div className="w-10 h-10 bg-tvde-primary rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
            {userData?.nome ? getInitials(userData.nome) : <User size={20} />}
          </div>
        </div>
      </div>
    </header>
  );
}