/**
 * App.jsx
 * Localização: src/App.jsx
 *
 * Ponto de entrada da aplicação.
 * Atualizado com:
 * - Novas rotas de Serviços (/servicos-gratuitos, /servicos-avulsos, /cursos)
 * - Componentes de visualização integrados e estilizados para evitar erros de rotas vazias
 * - Preservação estrita de todos os fluxos de autenticação, Firebase, Google Analytics 4 e rotas existentes
 */

import { useEffect, useState } from 'react';
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
import MigracaoFirestore from './pages/MigracaoFirestore';

// Importação das páginas de Assessoria de Clientes
import Assessorados from './pages/Assessorados';
import ServicosConfig from './pages/ServicosConfig';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (GA_MEASUREMENT_ID) {
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

/**
 * ◄ COMPONENTES DE VISUALIZAÇÃO INTERNOS (EVITAM ERROS DE IMPORTAÇÃO)
 */

// 1. Serviços Gratuitos
function ServicosGratuitos() {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Serviços Gratuitos</h2>
      <p className="text-slate-500 text-sm mb-6">Explore as ferramentas gratuitas de assessoria regulamentar e suporte para motoristas e parceiros TVDE em Portugal.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-100 p-5 rounded-xl hover:border-blue-500/35 hover:shadow-lg hover:shadow-slate-100 transition-all flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-1">Gerador de Dístico TVDE</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">Crie e descarregue o seu dístico regulamentar em formato PDF de acordo com as regras oficiais do IMT.</p>
          </div>
          <a href="/gerador-distico" className="text-xs font-bold text-tvde-primary hover:underline self-start">Aceder Ferramenta →</a>
        </div>
        
        <div className="border border-slate-100 p-5 rounded-xl hover:border-blue-500/35 hover:shadow-lg hover:shadow-slate-100 transition-all flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-1">Guia de Onboarding e Legalização</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">O guia regulamentar e prático para quem está a iniciar o processo de legalização como motorista TVDE em Portugal.</p>
          </div>
          <a href="/guia-onboarding" className="text-xs font-bold text-tvde-primary hover:underline self-start">Ler Guia Digital →</a>
        </div>
      </div>
    </div>
  );
}

// 2. Serviços Avulsos
function ServicosAvulsos() {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Serviços Avulsos de Assessoria</h2>
      <p className="text-slate-500 text-sm mb-6">Apoio burocrático e administrativo pontual. Selecione e acompanhe os pedidos diretamente com a nossa equipa.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Abertura de Atividade", desc: "Suporte completo no registo inicial junto da Autoridade Tributária com os CAEs corretos (CAE 49320) e enquadramentos fiscais (Artigo 53.º)." },
          { title: "Submissão de Licença IMT", desc: "Tratamento administrativo, preenchimento de formulários e submissão de processos de licenciamento TVDE de viaturas." },
          { title: "Contratos de Prestação", desc: "Elaboração e validação de minutas de contratos de prestação de serviços ajustados ao enquadramento jurídico do setor." }
        ].map((item, idx) => (
          <div key={idx} className="border border-slate-100 p-5 rounded-xl hover:border-blue-500/20 transition-all flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-1.5">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
            <button className="text-xs font-bold text-tvde-primary hover:underline mt-4 text-left">Solicitar Serviço →</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. Cursos
function Cursos() {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Cursos e Formação Obrigatória</h2>
      <p className="text-slate-500 text-sm mb-6">Inscrições e parcerias em cursos certificados pelo IMT para a atividade de TVDE.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-100 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-[9px] bg-emerald-50 text-emerald-600 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">Obrigatório IMT</span>
            <h3 className="font-bold text-sm text-slate-800 mt-2 mb-1">Formação Inicial TVDE (50h)</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">Acesso ao curso teórico e prático para obtenção da licença de motorista TVDE.</p>
          </div>
          <button className="text-xs font-bold text-tvde-primary hover:underline self-start">Ver Próximas Turmas →</button>
        </div>
        
        <div className="border border-slate-100 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-[9px] bg-blue-50 text-blue-600 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">Renovação Quinquenal</span>
            <h3 className="font-bold text-sm text-slate-800 mt-2 mb-1">Formação Contínua TVDE (8h)</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">Atualização obrigatória a cada 5 anos para renovação da licença regulamentar.</p>
          </div>
          <button className="text-xs font-bold text-tvde-primary hover:underline self-start">Inscrever Agora →</button>
        </div>
      </div>
    </div>
  );
}

/**
 * ◄ SEGURANÇA DE ROTAS
 */
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

  // Controlo de estado para gaveta de navegação mobile
  const [sidebarAberta, setSidebarAberta] = useState(false);

  useEffect(() => {
    if (GA_MEASUREMENT_ID) {
      ReactGA.send({ hitType: "pageview", page: location.pathname });
    }
    // Fecha o menu lateral automaticamente ao navegar entre páginas no telemóvel
    setSidebarAberta(false);
  }, [location]);

  const isPublicPath = 
    location.pathname === '/' || 
    location.pathname === '/login' || 
    location.pathname === '/guia-onboarding' ||
    location.pathname === '/gerador-distico' ||
    location.pathname === '/migracao' || 
    location.pathname.startsWith('/blog') ||
    location.pathname.startsWith('/onboarding');

  const mostrarLayoutERP = user && !isPublicPath;

  return (
    <div className="flex min-h-screen bg-tvde-bg overflow-x-hidden">
      {/* Sidebar recebe os controlos de visualização mobile */}
      {mostrarLayoutERP && (
        <Sidebar aberta={sidebarAberta} setAberta={setSidebarAberta} />
      )}
      
      {/* ml-64 passa a lg:ml-64 (afasta apenas no computador) */}
      <div className={`flex-1 flex flex-col min-w-0 ${mostrarLayoutERP ? 'lg:ml-64 ml-0' : ''}`}>
        
        {/* Header recebe o gatilho para abrir a Sidebar no telemóvel */}
        {mostrarLayoutERP && (
          <Header setSidebarAberta={setSidebarAberta} />
        )}
        
        {/* Padding fluido (p-4 no telemóvel, p-8 no computador) */}
        <main className={mostrarLayoutERP ? "p-4 sm:p-8 pt-4" : ""}>
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
            
            {/* Nova Rota de Gestão de Clientes em Assessoria */}
            <Route path="/assessorados" element={<PrivateRoute><Assessorados /></PrivateRoute>} />
            
            {/* ◄ ADICIONADOS: Novos caminhos de Serviços dentro do ecossistema ERP */}
            <Route path="/servicos-gratuitos" element={<PrivateRoute><ServicosGratuitos /></PrivateRoute>} />
            <Route path="/servicos-avulsos" element={<PrivateRoute><ServicosAvulsos /></PrivateRoute>} />
            <Route path="/cursos" element={<PrivateRoute><Cursos /></PrivateRoute>} />

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
            
            {/* Nova Rota de Configuração de Planos (Exclusivo Diretor) */}
            <Route path="/config/servicos" element={<AdminRoute><ServicosConfig /></AdminRoute>} />
            
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