/**
 * leadService.js
 * Localização: src/services/leadService.js
 *
 * Serviço Firestore para gestão e captação de leads públicas do website.
 */

import { db } from '../firebase'; 
import { collection, addDoc } from 'firebase/firestore';

/**
 * Valida se um número de telemóvel cumpre o padrão português:
 * - Opcionalmente começa por +351 ou 00351
 * - Tem 9 dígitos e começa por 9 (91, 92, 93, 96) ou rede fixa (2)
 *
 * @param {string} numero - Telemóvel a validar
 * @returns {boolean}
 */
export const validarTelemovelPT = (numero) => {
  if (!numero) return false;
  // Limpa espaços e traços para validação limpa
  const limpo = numero.replace(/[\s-]/g, '');
  const regexPT = /^(?:\+351|00351)?(9[1236]\d{7}|2\d{8})$/;
  return regexPT.test(limpo);
};

/**
 * Valida a estrutura sintática de um endereço de email.
 *
 * @param {string} email
 * @returns {boolean}
 */
export const validarEmail = (email) => {
  if (!email) return false;
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regexEmail.test(email.trim());
};

/**
 * Regista uma nova lead captada no formulário público para o Firestore.
 * 
 * @param {Object} dados
 *   @param {string} dados.nome              - Nome do candidato
 *   @param {string} dados.email             - Endereço de correio eletrónico
 *   @param {string} dados.telemovel         - Telemóvel de contacto (formato PT)
 *   @param {string} dados.origem            - "isca_ebook" | "assessoria_completa" | "procura_viatura"
 *   @param {string} dados.mensagemAdicional - Mensagem adicional ou observações do utilizador
 * @returns {Promise<{ sucesso: boolean, id: string|null, msg: string }>}
 */
export const registarLeadPública = async (dados) => {
  try {
    const nome = dados.nome?.trim() || '';
    const email = dados.email?.trim() || '';
    const telemovel = dados.telemovel?.replace(/[\s-]/g, '') || '';
    const origem = dados.origem || 'isca_ebook';
    const mensagemAdicional = dados.mensagemAdicional?.trim() || '';

    // 1. Validações básicas de preenchimento
    if (!nome) {
      return { sucesso: false, id: null, msg: "Por favor, introduza o seu nome." };
    }

    if (!validarEmail(email)) {
      return { sucesso: false, id: null, msg: "Por favor, introduza um endereço de email válido." };
    }

    if (!validarTelemovelPT(telemovel)) {
      return { sucesso: false, id: null, msg: "Por favor, introduza um número de telemóvel válido em Portugal." };
    }

    // 2. Preparação do payload para gravação
    const payload = {
      nome,
      email,
      telemovel,
      origem,
      mensagemAdicional,
      estado: 'novo', // Estado inicial da lead para controlo de gestão de funil
      gestorAtribuidoId: '', // Vazio inicialmente
      criadoEm: new Date().toISOString()
    };

    console.log("[leadService] A submeter nova lead pública para registo...", payload);

    // 3. Gravação no Firestore
    const docRef = await addDoc(collection(db, 'leads_captadas'), payload);

    console.log("[leadService] Lead registada com sucesso com o ID:", docRef.id);

    return {
      sucesso: true,
      id: docRef.id,
      msg: "O seu pedido foi registado com sucesso. Entraremos em contacto brevemente."
    };

  } catch (error) {
    console.error("[leadService] Erro fatal ao registar lead pública:", error);
    return {
      sucesso: false,
      id: null,
      msg: "Ocorreu um erro técnico ao submeter o seu pedido. Por favor, tente novamente mais tarde."
    };
  }
};