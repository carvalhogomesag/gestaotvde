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
import EGuiaPage from './pages/EGuiaPage';
import Blog from './pages/Blog';
import GeradorDistico from './pages/GeradorDistico';
import ReactGA from 'react-ga4';
import CentroComando from './pages/CentroComando';
import OnboardingMotorista from './pages/OnboardingMotorista';
import MigracaoFirestore from './pages/MigracaoFirestore'; // ◄ Importado temporariamente para manutenção

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (GA_MEASUREMENT_ID) {
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" />;
};

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
    }
  }, [location]);

  const isPublicPath = 
    location.pathname === '/' || 
    location.pathname === '/login' || 
    location.pathname === '/guia-onboarding' ||
    location.pathname === '/gerador-distico' ||
    location.pathname === '/migracao' || // ◄ Adicionado para limpar layout na página de migração
    location.pathname.startsWith('/blog') ||
    location.pathname.startsWith('/onboarding');

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
            <Route path="/gerador-distico" element={<GeradorDistico />} />
            
            {/* ROTA TEMPORÁRIA DE MIGRAÇÃO */}
            <Route path="/migracao" element={<MigracaoFirestore />} />

            {/* ROTAS PROTEGIDAS — ERP */}
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/motoristas" element={<PrivateRoute><Motoristas /></PrivateRoute>} />
            <Route path="/leads" element={<PrivateRoute><GestaoLeads /></PrivateRoute>} />
            <Route path="/veiculos" element={<PrivateRoute><Veiculos /></PrivateRoute>} />
            <Route path="/proprietarios" element={<PrivateRoute><Proprietarios /></PrivateRoute>} />
            <Route path="/tarefas" element={<PrivateRoute><MinhasTarefas /></PrivateRoute>} />
            <Route path="/cartoes/abastecimento" element={<PrivateRoute><CartoesGestao tipo="combustivel" /></PrivateRoute>} />
            <Route path="/cartoes/carregamento" element={<PrivateRoute><CartoesGestao tipo="eletrico" /></PrivateRoute>} />
            <Route path="/config" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />

            {/* ROTAS RESTRITAS AO DIRETOR */}
            <Route path="/centro-comando" element={<AdminRoute><CentroComando /></AdminRoute>} />
            <Route path="/fecho-semanal" element={<AdminRoute><FechoSemanal /></AdminRoute>} />
            <Route path="/utilizadores" element={<AdminRoute><GestaoUtilizadores /></AdminRoute>} />
            <Route path="/logs" element={<AdminRoute><LogsSistema /></AdminRoute>} />

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