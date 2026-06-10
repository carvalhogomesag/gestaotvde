import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Car, UserCheck, Users, 
  Settings, LogOut, CreditCard, ChevronDown, ChevronUp,
  Fuel, Zap, ClipboardList, User as UserIcon, Inbox, ShieldAlert, Users2,
  Sparkles, UserPlus 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * MenuItem - Versão Compacta
 */
const MenuItem = ({ icon: Icon, label, to, active }) => (
  <Link to={to} className={`flex items-center gap-2.5 py-1.5 px-3 rounded-lg transition-all ${
    active 
    ? 'bg-tvde-primary text-white shadow-md shadow-blue-500/20' 
    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
  }`}>
    <Icon size={18} />
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

/**
 * SubMenuItem - Versão Compacta
 */
const SubMenuItem = ({ icon: Icon, label, to, active }) => (
  <Link to={to} className={`flex items-center gap-2.5 py-1 px-2.5 pl-4 rounded-lg transition-all ${
    active 
    ? 'text-white bg-slate-700/40' 
    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
  }`}>
    {Icon && <Icon size={14} />}
    <span className="font-medium text-xs">{label}</span>
  </Link>
);

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData, logout } = useAuth();
  
  // Referências para o scroll automático
  const registrosRef = useRef(null);
  const cartoesRef = useRef(null);

  const [isRegistrosOpen, setIsRegistrosOpen] = useState(true);
  const [isCartoesOpen, setIsCartoesOpen] = useState(false);

  // Mapeamento que identifica se algum sub-registo está ativo
  const isRegistrosActive = ['/motoristas', '/veiculos', '/proprietarios', '/cartoes'].some(path => 
    location.pathname.includes(path)
  );

  /**
   * Efeito de Scroll para Registos com Salvaguarda de Referência
   */
  useEffect(() => {
    if (isRegistrosOpen && registrosRef.current) {
      const timer = setTimeout(() => {
        if (registrosRef.current) {
          registrosRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isRegistrosOpen]);

  /**
   * Efeito de Scroll para Cartões com Salvaguarda de Referência
   */
  useEffect(() => {
    if (isCartoesOpen && cartoesRef.current) {
      const timer = setTimeout(() => {
        if (cartoesRef.current) {
          cartoesRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isCartoesOpen]);

  // Correção efetuada: Ao efetuar logout, o utilizador é encaminhado de volta para a Landing Page pública
  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair?")) {
      await logout();
      navigate('/'); // Redirecionamento configurado para a rota raiz pública
    }
  };

  return (
    <aside className="w-64 h-screen bg-tvde-dark text-white p-3 flex flex-col fixed left-0 top-0 z-40 shadow-2xl">
      {/* Header Compacto */}
      <div className="mb-5 px-2">
        <h1 className="text-lg font-bold tracking-tight text-white">
          TVDE<span className="text-tvde-primary text-xl">.</span>Gestão
        </h1>
        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold italic">Operador Portugal</p>
      </div>
      
      {/* Navegação Principal */}
      <nav 
        className="flex-1 space-y-0.5 overflow-y-auto pr-1 scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <MenuItem 
          icon={LayoutDashboard} 
          label="Dashboard" 
          to="/dashboard" 
          active={location.pathname === '/dashboard'} 
        />

        <MenuItem 
          icon={Inbox} 
          label="Minhas Tarefas" 
          to="/tarefas" 
          active={location.pathname === '/tarefas'} 
        />

        {/* Gestão de Leads */}
        <MenuItem 
          icon={UserPlus} 
          label="Gestão de Leads" 
          to="/leads" 
          active={location.pathname === '/leads'} 
        />

        {/* Grupo Administração */}
        <div className="pt-2 space-y-0.5" ref={registrosRef}>
          <p className="text-[9px] font-black text-slate-600 uppercase px-3 tracking-widest mb-1">Administração</p>
          
          <button 
            onClick={() => setIsRegistrosOpen(!isRegistrosOpen)}
            className={`w-full flex items-center justify-between py-1.5 px-3 rounded-lg transition-all ${
              isRegistrosActive ? 'text-white bg-slate-800/30' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ClipboardList size={18} />
              <span className="font-medium text-sm">Registos</span>
            </div>
            {isRegistrosOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          {isRegistrosOpen && (
            <div className="ml-3 pl-3 border-l border-slate-800/50 space-y-0.5 mt-0.5 animate-in slide-in-from-top-1 duration-200">
              <SubMenuItem icon={UserCheck} label="Motoristas" to="/motoristas" active={location.pathname === '/motoristas'} />
              <SubMenuItem icon={Car} label="Veículos" to="/veiculos" active={location.pathname === '/veiculos'} />
              <SubMenuItem icon={Users} label="Proprietários" to="/proprietarios" active={location.pathname === '/proprietarios'} />

              {/* Sub-menu Cartões */}
              <div className="space-y-0.5 pt-0.5" ref={cartoesRef}>
                <button 
                  onClick={() => setIsCartoesOpen(!isCartoesOpen)}
                  className="w-full flex items-center justify-between py-1 px-2.5 pl-4 text-slate-500 hover:text-white rounded-lg transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard size={14} />
                    <span className="font-medium text-xs">Cartões</span>
                  </div>
                  {isCartoesOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>

                {isCartoesOpen && (
                  <div className="ml-3 space-y-0.5 animate-in fade-in duration-150">
                    <SubMenuItem icon={Fuel} label="Abastecimento" to="/cartoes/abastecimento" active={location.pathname === '/cartoes/abastecimento'} />
                    <SubMenuItem icon={Zap} label="Carregamento" to="/cartoes/carregamento" active={location.pathname === '/cartoes/carregamento'} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Secção Segurança e Finanças - EXCLUSIVA ADMIN */}
        {userData?.role === 'admin' && (
          <div className="pt-3 space-y-0.5 border-t border-slate-800/50 mt-2">
            <p className="text-[9px] font-black text-red-500/40 uppercase px-3 tracking-widest mb-1">Direção e Finanças</p>
            
            {/* CENTRO DE COMANDO IA */}
            <MenuItem 
              icon={Sparkles} 
              label="Centro de Comando" 
              to="/centro-comando" 
              active={location.pathname === '/centro-comando'} 
            />

            <MenuItem 
              icon={ClipboardList} 
              label="Fecho Semanal" 
              to="/fecho-semanal" 
              active={location.pathname === '/fecho-semanal'} 
            />

            <MenuItem 
              icon={Users2} 
              label="Gestão de Equipa" 
              to="/utilizadores" 
              active={location.pathname === '/utilizadores'} 
              />
            <MenuItem 
              icon={ShieldAlert} 
              label="Auditoria Global" 
              to="/logs" 
              active={location.pathname === '/logs'} 
            />
          </div>
        )}
      </nav>

      {/* Rodapé Fixo */}
      <div className="mt-auto pt-3 border-t border-slate-800/60 space-y-0.5">
        <MenuItem 
          icon={Settings} 
          label="Configurações" 
          to="/config" 
          active={location.pathname === '/config'} 
        />

        <div className="px-2.5 py-1.5 bg-slate-800/30 rounded-lg flex items-center gap-2.5 border border-slate-700/30">
          <div className="w-7 h-7 bg-tvde-primary rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-sm uppercase">
            {userData?.nome ? userData.nome[0] : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate text-slate-100">{userData?.nome || 'Utilizador'}</p>
            <p className="text-[10px] text-tvde-primary font-black uppercase tracking-tighter">{userData?.role || 'Acesso'}</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 py-1.5 px-3 rounded-lg text-slate-500 hover:bg-red-900/10 hover:text-red-400 transition-all cursor-pointer"
        >
          <LogOut size={18} />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </div>
    </aside>
  );
}