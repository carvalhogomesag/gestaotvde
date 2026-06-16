/**
 * App.jsx
 * Localização: src/App.jsx
 *
 * Ponto de entrada da aplicação.
 * Atualizado com:
 * - Vistas internas (ServicosGratuitos, ServicosAvulsos e Cursos) sincronizadas em tempo real com o Firestore [2].
 * - Filtros do Google Analytics 4 (GA4) para bloquear localhost e excluir visualizações de páginas privadas do ERP [4].
 * - Preservação estrita de todos os fluxos de autenticação, Firebase e rotas existentes.
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

// Importação das dependências do Firestore para sincronização unificada [2]
import { db } from './firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Detecção de ambiente de desenvolvimento local (Localhost) [4]
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1'
);

// Apenas inicializa o GA4 se houver ID configurado e não for ambiente de testes local [4]
if (GA_MEASUREMENT_ID && !isLocalhost) {
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

/**
 * ◄ COMPONENTES DE VISUALIZAÇÃO INTERNOS (SINCRONIZADOS EM TEMPO REAL)
 */

// 1. Serviços Gratuitos (Sincronizado)
function ServicosGratuitos() {
  const [itensDinamicos, setItensDinamicos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtra serviços assinalados como gratuitos ou com preço a zero [2]
      const filtrados = lista.filter(item => item.isGratuito === true || item.preco === 0);
      setItensDinamicos(filtrados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Serviços Gratuitos</h2>
      <p className="text-slate-500 text-sm mb-6">Explore as ferramentas gratuitas de assessoria regulamentar e suporte para motoristas e parceiros TVDE em Portugal.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Utilitário do Sistema Fixo 1 */}
        <div className="border border-slate-100 p-5 rounded-xl hover:border-blue-500/35 hover:shadow-lg hover:shadow-slate-100 transition-all flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-1">Gerador de Dístico TVDE</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">Crie e descarregue o seu dístico regulamentar em formato PDF de acordo com as regras oficiais do IMT.</p>
          </div>
          <a href="/gerador-distico" className="text-xs font-bold text-tvde-primary hover:underline self-start">Aceder Ferramenta →</a>
        </div>
        
        {/* Utilitário do Sistema Fixo 2 */}
        <div className="border border-slate-100 p-5 rounded-xl hover:border-blue-500/35 hover:shadow-lg hover:shadow-slate-100 transition-all flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-1">Guia de Onboarding e Legalização</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">O guia regulamentar e prático para quem está a iniciar o processo de legalização como motorista TVDE em Portugal.</p>
          </div>
          <a href="/guia-onboarding" className="text-xs font-bold text-tvde-primary hover:underline self-start">Ler Guia Digital →</a>
        </div>

        {/* Serviços Gratuitos adicionados dinamicamente no painel administrativo [2] */}
        {!loading && itensDinamicos.map(item => (
          <div key={item.id} className="border border-slate-100 p-5 rounded-xl hover:border-blue-500/35 hover:shadow-lg hover:shadow-slate-100 transition-all flex flex-col justify-between relative">
            <div>
              <span className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                {item.destinatario === 'proprietario' ? '🏢 Proprietário' : '🙋‍♂️ Motorista'}
              </span>
              <h3 className="font-bold text-sm text-slate-800 mb-1">{item.nome}</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">{item.descricao}</p>
            </div>
            <span className="text-xs font-black text-emerald-600 uppercase">Grátis</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. Serviços Avulsos (Sincronizado)
function ServicosAvulsos() {
  const [itensDinamicos, setItensDinamicos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtra serviços individuais que não sejam gratuitos nem cursos [2]
      const filtrados = lista.filter(item => item.tipo === 'avulso' && !item.isGratuito && item.preco > 0 && !item.isCurso);
      setItensDinamicos(filtrados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Serviços Avulsos de Assessoria</h2>
      <p className="text-slate-500 text-sm mb-6">Apoio burocrático e administrativo pontual. Selecione e acompanhe os pedidos diretamente com a nossa equipa.</p>
      
      {loading ? (
        <div className="text-center py-6 text-slate-400 text-xs font-semibold">A carregar serviços...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {itensDinamicos.length > 0 ? (
            itensDinamicos.map((item) => (
              <div key={item.id} className="border border-slate-100 p-5 rounded-xl hover:border-blue-500/20 transition-all flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-slate-50 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase mb-2">
                    {item.destinatario === 'proprietario' ? '🏢 Proprietário' : '🙋‍♂️ Motorista'}
                  </span>
                  <h3 className="font-bold text-sm text-slate-800 mb-1.5">{item.nome}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.descricao}</p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                  <span className="text-xs font-black text-tvde-primary">{item.preco}€</span>
                  <button className="text-xs font-bold text-tvde-primary hover:underline">Solicitar Serviço →</button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-6 text-xs text-slate-400 italic">
              Nenhum serviço avulso dinâmico cadastrado de momento.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 3. Cursos (Sincronizado)
function Cursos() {
  const [itensDinamicos, setItensDinamicos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtra apenas serviços que tenham o marcador isCurso ativo [2]
      const filtrados = lista.filter(item => item.isCurso === true);
      setItensDinamicos(filtrados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Cursos e Formação Obrigatória</h2>
      <p className="text-slate-500 text-sm mb-6">Inscrições e parcerias em cursos certificados pelo IMT para a atividade de TVDE.</p>
      
      {loading ? (
        <div className="text-center py-6 text-slate-400 text-xs font-semibold">A carregar formações...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {itensDinamicos.length > 0 ? (
            itensDinamicos.map((item) => (
              <div key={item.id} className="border border-slate-100 p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {item.destinatario === 'proprietario' ? '🏢 Curso Gestão' : '🎓 Curso Motorista'}
                  </span>
                  <h3 className="font-bold text-sm text-slate-800 mt-2 mb-1">{item.nome}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{item.descricao}</p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                  <span className="text-xs font-black text-slate-800">
                    {item.isGratuito || item.preco === 0 ? 'Grátis' : `${item.preco}€`}
                  </span>
                  <button className="text-xs font-bold text-tvde-primary hover:underline">Inscrever Agora →</button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-6 text-xs text-slate-400 italic">
              Nenhum curso dinâmico cadastrado de momento.
            </div>
          )}
        </div>
      )}
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
    // Apenas dispara o Pageview para marketing se não for localhost e for rota pública [4]
    if (GA_MEASUREMENT_ID && !isLocalhost) {
      const rotasPublicas = [
        '/',
        '/login',
        '/guia-onboarding',
        '/gerador-distico',
        '/blog'
      ];
      
      const isPublicPath = rotasPublicas.some(path => 
        location.pathname === path || 
        location.pathname.startsWith('/blog/') || 
        location.pathname.startsWith('/onboarding/')
      );

      if (isPublicPath) {
        ReactGA.send({ hitType: "pageview", page: location.pathname });
      }
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
            
            {/* Novos caminhos de Serviços dentro do ecossistema ERP (Sincronizados) */}
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