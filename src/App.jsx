import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Motoristas from './pages/Motoristas';
import Veiculos from './pages/Veiculos';
import Proprietarios from './pages/Proprietarios';
import CartoesGestao from './pages/CartoesGestao';
import Configuracoes from './pages/Configuracoes';
import MinhasTarefas from './pages/MinhasTarefas';
import LogsSistema from './pages/LogsSistema'; 
import GestaoUtilizadores from './pages/GestaoUtilizadores';
import FechoSemanal from './pages/FechoSemanal';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage'; // Importação do novo site público
import GestaoLeads from './pages/GestaoLeads'; // Importação do novo painel de CRM

// PÁGINAS DE IA E ONBOARDING
import CentroComando from './pages/CentroComando';
import OnboardingMotorista from './pages/OnboardingMotorista';

// ⚠️ TEMPORÁRIO — Remover após executar a migração de cartões
import MigracaoCartoes from './pages/MigracaoCartoes';

/**
 * PrivateRoute: Proteção para qualquer utilizador autenticado.
 */
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

/**
 * AdminRoute: Proteção EXCLUSIVA para o Diretor (admin).
 */
const AdminRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (userData?.role !== 'admin') return <Navigate to="/dashboard" />; // Redirecionamento seguro para o dashboard interno
  return children;
};

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  // Mapeamento de rotas públicas para isolamento do layout administrativo do ERP
  const isPublicPath = 
    location.pathname === '/' || 
    location.pathname === '/login' || 
    location.pathname.startsWith('/onboarding');

  // O ERP com Sidebar e Header só é exibido se o utilizador estiver autenticado e fora de rotas públicas
  const mostrarLayoutERP = user && !isPublicPath;

  return (
    <div className="flex min-h-screen bg-tvde-bg">
      {mostrarLayoutERP && <Sidebar />}
      
      <div className={`flex-1 flex flex-col ${mostrarLayoutERP ? 'ml-64' : ''}`}>
        {mostrarLayoutERP && <Header />}
        
        <main className={mostrarLayoutERP ? "p-8 pt-4" : ""}>
          <Routes>
            {/* ROTAS PÚBLICAS */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/onboarding/:driverId" element={<OnboardingMotorista />} />

            {/* ⚠️ TEMPORÁRIO — Remover após executar a migração de cartões */}
            <Route path="/migracao-cartoes" element={<MigracaoCartoes />} />

            {/* ROTAS PROTEGIDAS DA ÁREA DE CLIENTES/ERP */}
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/motoristas" element={<PrivateRoute><Motoristas /></PrivateRoute>} />
            <Route path="/leads" element={<PrivateRoute><GestaoLeads /></PrivateRoute>} /> {/* Nova rota do CRM registada */}
            <Route path="/veiculos" element={<PrivateRoute><Veiculos /></PrivateRoute>} />
            <Route path="/proprietarios" element={<PrivateRoute><Proprietarios /></PrivateRoute>} />
            <Route path="/tarefas" element={<PrivateRoute><MinhasTarefas /></PrivateRoute>} />
            <Route path="/cartoes/abastecimento" element={<PrivateRoute><CartoesGestao tipo="combustivel" /></PrivateRoute>} />
            <Route path="/cartoes/carregamento" element={<PrivateRoute><CartoesGestao tipo="eletrico" /></PrivateRoute>} />
            <Route path="/config" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />

            {/* ROTAS RESTRITAS AO DIRETOR (ADMIN) */}
            <Route path="/centro-comando" element={<AdminRoute><CentroComando /></AdminRoute>} />
            <Route path="/fecho-semanal" element={<AdminRoute><FechoSemanal /></AdminRoute>} />
            <Route path="/utilizadores" element={<AdminRoute><GestaoUtilizadores /></AdminRoute>} />
            <Route path="/logs" element={<AdminRoute><LogsSistema /></AdminRoute>} />

            {/* Redirecionamento inteligente de segurança */}
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;