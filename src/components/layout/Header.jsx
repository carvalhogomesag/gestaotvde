/**
 * Header.jsx
 * Localização: src/components/layout/Header.jsx
 *
 * Cabeçalho administrativo do ERP.
 * Atualizado com:
 * - Menu Dropdown de Serviços
 * - Botão de menu hambúrguer para mobile
 * - Paddings fluidos e adaptabilidade a ecrãs reduzidos
 * - Integração em tempo real com notificações de tickets pendentes
 * - [NOVO] Slot dinâmico recetor (header-dynamic-slot) para injeção de títulos/botões locais das páginas.
 */

import React, { useState, useEffect, useRef } from 'react';
import GlobalSearch from './GlobalSearch';
import { Bell, User, Clock, ArrowRight, Inbox, AlertCircle, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Header({ setSidebarAberta }) {
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasUnseenAlert, setHasUnseenAlert] = useState(false);
  const dropdownRef = useRef(null);

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

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
    if (notifications.length > 0) {
      setHasUnseenAlert(false);
      localStorage.setItem(`lastSeenTicket_${userData.nome}`, notifications[0].id);
    }
  };

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
    <header className="h-20 flex items-center justify-between px-4 sm:px-8 bg-tvde-bg/80 backdrop-blur-md sticky top-0 z-30">
      
      {/* Contentor flexível de pesquisa, navegação e slot dinâmico */}
      <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
        <button
          type="button"
          onClick={() => setSidebarAberta(true)}
          className="lg:hidden p-2 text-slate-500 hover:text-tvde-primary hover:bg-white rounded-xl transition-all cursor-pointer shrink-0"
          aria-label="Abrir menu lateral"
        >
          <Menu size={20} />
        </button>
        
        <GlobalSearch />

        {/* MENU DROPDOWN DE SERVIÇOS */}
        <nav className="hidden lg:flex items-center">
          <div className="relative group px-3">
            <button className="text-xs font-black text-slate-600 hover:text-tvde-primary uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer py-2">
              Serviços <span className="text-[9px]">▼</span>
            </button>
            
            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]">
              {[
                { label: 'Gratuitos', path: '/servicos-gratuitos' },
                { label: 'Planos de Assessoria', path: '/assessorados' },
                { label: 'Serviços Avulsos', path: '/servicos-avulsos' },
                { type: 'divider' },
                { label: 'Motoristas', path: '/motoristas' },
                { label: 'Proprietários', path: '/proprietarios' },
                { label: 'Cursos', to: '/cursos' }
              ].map((item, index) => {
                if (item.type === 'divider') return <div key={index} className="border-t border-slate-100 my-1" />;
                return (
                  <Link 
                    key={index} 
                    to={item.path} 
                    className="block px-6 py-2.5 text-xs font-bold text-slate-600 hover:text-tvde-primary hover:bg-blue-50/50 transition-colors"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* [NOVO] SLOT DINÂMICO RECETOR PARA PÁGINAS DO ERP */}
        <div id="header-dynamic-slot" className="hidden md:flex items-center gap-3 ml-2 flex-1"></div>
      </div>
      
      <div className="flex items-center gap-4 shrink-0">
        <div id="navbar-slot-ia" className="flex items-center mr-2"></div>

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
                          {task.vinculoNome || 'Tarefa Geral'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">
                          {task.descricao}
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-slate-350 shrink-0" />
                    </button>
                  ))
                ) : (
                  <p className="p-10 text-center text-slate-400 italic text-xs">Sem tarefas pendentes.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-2.5 py-1.5 bg-slate-800/30 rounded-lg flex items-center gap-2.5 border border-slate-700/30">
          <div className="w-7 h-7 bg-tvde-primary rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-sm uppercase">
            {userData?.nome ? userData.nome[0] : 'U'}
          </div>
          <div className="overflow-hidden hidden sm:block">
            <p className="text-xs font-bold truncate text-slate-100">{userData?.nome || 'Utilizador'}</p>
            <p className="text-[10px] text-tvde-primary font-black uppercase tracking-tighter">{userData?.role || 'Acesso'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}