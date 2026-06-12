import { useEffect } from 'react';
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
import LandingPage from './pages/LandingPage'; 
import GestaoLeads from './pages/GestaoLeads'; 
import EGuiaPage from './pages/EGuiaPage'; // Importação da nova página do Guia de Onboarding
import Blog from './pages/Blog'; // Importação do novo módulo de Blog e SEO

// Importação do Google Analytics
import ReactGA from 'react-ga4';

// PÁGINAS DE IA E ONBOARDING
import CentroComando from './pages/CentroComando';
import OnboardingMotorista from './pages/OnboardingMotorista';

// ⚠️ TEMPORÁRIO — Remover após executar a migração de cartões
import MigracaoCartoes from './pages/MigracaoCartoes';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (GA_MEASUREMENT_ID) {
  ReactGA.initialize(GA_MEASUREMENT_ID);
  console.log("[App] Google Analytics 4 inicializado com sucesso.");
}

/**
 * PrivateRoute: Se o utilizador não estiver logado,
 * redireciona de volta para a Landing Page pública (/)
 */
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" />; 
};

/**
 * AdminRoute: Proteção EXCLUSIVA para o Diretor (admin).
 * Se deslogado, redireciona para a Landing Page pública (/)
 */
const AdminRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" />; 
  if (userData?.role !== 'admin') return <Navigate to="/dashboard" />; 
  return children;
};

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (GA_MEASUREMENT_ID) {
      ReactGA.send({ hitType: "pageview", page: location.pathname });
      console.log(`[GA4] Pageview registado para: ${location.pathname}`);
    }
  }, [location]);

  // Mapeamento de rotas públicas para isolamento do layout administrativo do ERP
  const isPublicPath = 
    location.pathname === '/' || 
    location.pathname === '/login' || 
    location.pathname === '/guia-onboarding' ||
    location.pathname.startsWith('/blog') ||
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
            <Route path="/guia-onboarding" element={<EGuiaPage />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<Blog />} />

            {/* ⚠️ TEMPORÁRIO — Remover após executar a migração de cartões */}
            <Route path="/migracao-cartoes" element={<MigracaoCartoes />} />

            {/* ROTAS PROTEGIDAS DA ÁREA DE CLIENTES/ERP */}
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/motoristas" element={<PrivateRoute><Motoristas /></PrivateRoute>} />
            <Route path="/leads" element={<PrivateRoute><GestaoLeads /></PrivateRoute>} />
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