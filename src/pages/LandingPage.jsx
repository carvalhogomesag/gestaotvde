/**
 * LandingPage.jsx
 * Localização: src/pages/LandingPage.jsx
 *
 * Página inicial pública. Orquestra os componentes de forma desacoplada.
 * A lógica de carregamento de dados dos serviços foi movida para o componente ServicosTabs.
 */

import React, { useState } from 'react';
import ReactGA from 'react-ga4';

// Componentes
import NavbarLanding from '../components/public/NavbarLanding';
import HeroSection from '../components/public/HeroSection';
import ServicosTabs from '../components/public/ServicosTabs'; 
import CatalogoViaturas from '../components/public/CatalogoViaturas';
import FormAluguer from '../components/public/FormAluguer';
import BlogDestaques from '../components/public/BlogDestaques';
import FaqAccordion from '../components/public/FaqAccordion';
import FooterLanding from '../components/public/FooterLanding';
import PlanoModal from '../components/public/PlanoModal';
import PublicChatWidget from '../components/public/PublicChatWidget';

export default function LandingPage() {
  const [isPlanoModalOpen, setIsPlanoModalOpen] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState('');

  const handleEscolherPlano = (planoNome) => {
    setPlanoSelecionado(planoNome);
    setIsPlanoModalOpen(true);
    
    // Analytics
    ReactGA.event({ 
      category: 'Lead Generation', 
      action: 'Click_Plano_Assessoria', 
      label: planoNome 
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans scroll-smooth flex flex-col justify-between">
      
      <NavbarLanding />
      <HeroSection />

      {/* Secção dinâmica que carrega os seus próprios dados do Firestore */}
      <ServicosTabs onEscolherPlano={handleEscolherPlano} />

      <CatalogoViaturas />
      <FormAluguer />
      <BlogDestaques />
      <FaqAccordion />
      <FooterLanding />
      
      <PublicChatWidget />

      <PlanoModal 
        isOpen={isPlanoModalOpen} 
        onClose={() => setIsPlanoModalOpen(false)} 
        plano={planoSelecionado} 
      />

    </div>
  );
}