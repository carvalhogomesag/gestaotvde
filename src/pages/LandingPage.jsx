/**
 * LandingPage.jsx
 * Localização: src/pages/LandingPage.jsx
 *
 * Página inicial pública otimizada e componentizada.
 * Orquestra de forma leve os novos componentes isolados na pasta public/ para 
 * facilitar o desenvolvimento e a manutenção com inteligência artificial.
 */

import React, { useState } from 'react';
import ReactGA from 'react-ga4';

// Componentes Públicos Estruturais Existentes
import NavbarLanding from '../components/public/NavbarLanding';
import PublicChatWidget from '../components/public/PublicChatWidget';
import CatalogoViaturas from '../components/public/CatalogoViaturas';

// Novos Componentes Isolados Refatorados (ServicosTabs removido)
import HeroSection from '../components/public/HeroSection';
import PlanosAssessoria from '../components/public/PlanosAssessoria';
import FormAluguer from '../components/public/FormAluguer';
import BlogDestaques from '../components/public/BlogDestaques';
import FaqAccordion from '../components/public/FaqAccordion';
import FooterLanding from '../components/public/FooterLanding';
import PlanoModal from '../components/public/PlanoModal';

export default function LandingPage() {
  // Controlo de abertura do modal de planos e seleção do respetivo pacote
  const [isPlanoModalOpen, setIsPlanoModalOpen] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState('');
  
  // Armazena as informações dinâmicas do carrinho de compras (itens e valor total)
  const [dadosCarrinho, setDadosCarrinho] = useState(null);

  // Ativação do Modal de Assessoria com preenchimento de plano e envio de analítica para o GA4
  const handleEscolherPlano = (planoNome, cartData = null) => {
    setPlanoSelecionado(planoNome);
    setDadosCarrinho(cartData);
    setIsPlanoModalOpen(true);

    // Envia evento dinâmico de clique para sabermos quais os pacotes com mais cliques
    ReactGA.event({
      category: 'Lead Generation',
      action: 'Click_Plano_Assessoria',
      label: planoNome
    });
  };

  const handleCloseModal = () => {
    setIsPlanoModalOpen(false);
    setDadosCarrinho(null); // Limpa os dados de checkout ao fechar
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans scroll-smooth flex flex-col justify-between">
      
      {/* 1. Barra de Navegação de Topo */}
      <NavbarLanding />

      {/* 2. Banner Global + Carrossel de Texto + Formulário de eGuia */}
      <HeroSection />

      {/* 3. Pacotes de Assessoria com Construtor de Pacote Personalizado (Carrinho) */}
      <PlanosAssessoria onEscolherPlano={handleEscolherPlano} />

      {/* 4. Catálogo Interativo de Viaturas de Operadores Parceiros */}
      <CatalogoViaturas />

      {/* 5. Formulário de Matching de Aluguer e Procura de Viaturas */}
      <FormAluguer />

      {/* 6. Destaques do Blog para SEO */}
      <BlogDestaques />

      {/* 7. Acordeão de Perguntas Frequentes (FAQ) */}
      <FaqAccordion />

      {/* 8. Rodapé Institucional */}
      <FooterLanding />

      {/* 9. Chat de IA Autónomo de Apoio Legislativo */}
      <PublicChatWidget />

      {/* 10. Modal/Gaveta Lateral de Reservas e Assessoria */}
      <PlanoModal 
        isOpen={isPlanoModalOpen} 
        onClose={handleCloseModal} 
        plano={planoSelecionado} 
        dadosCarrinho={dadosCarrinho}
      />

    </div>
  );
}