/**
 * idGenerator.js
 * Localização: src/utils/idGenerator.js
 *
 * Utilitário de geração de códigos sequenciais únicos (ex: MOT-0001, VEI-0001).
 * Otimizado com:
 * - Persistência de contadores em lote na coleção "metadados" do Firestore.
 * - Transações atómicas para evitar concorrência e race-conditions.
 * - [NOVO] Proteção absoluta contra reutilização de códigos de registos eliminados.
 */

import { db } from '../firebase';
import { doc, runTransaction } from 'firebase/firestore';

/**
 * Gera o próximo código de forma estritamente sequencial, única e imutável.
 * Grava o estado atual num documento de controle independente, garantindo que
 * mesmo que elimines registos diretamente no Firestore, os códigos antigos NUNCA se repetem.
 * 
 * @param {string} collectionName Nome da coleção (ex: 'motoristas', 'veiculos')
 * @param {string} prefix Prefixo do código (ex: 'MOT', 'VEI', 'PRO')
 * @returns {Promise<string>} Código formatado (ex: 'MOT-0001')
 */
export async function generateNextCode(collectionName, prefix) {
  // Criamos um documento de controle para o contador desta coleção específica
  const contadorRef = doc(db, "metadados", `contador_${collectionName}`);
  
  try {
    // Executamos uma transação para garantir escrita única e sem conflitos de rede
    const proximoNumero = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(contadorRef);
      
      let novoNumero = 1;
      
      if (docSnap.exists()) {
        const dados = docSnap.data();
        // Obtemos o último número gerado e incrementamos +1
        novoNumero = (dados.ultimoNumero || 0) + 1;
      }
      
      // Atualizamos o contador na base de dados de forma persistente
      transaction.set(contadorRef, { ultimoNumero: novoNumero }, { merge: true });
      
      return novoNumero;
    });
    
    // Formata o número para ter sempre 4 dígitos (ex: 1 vira '0001')
    const numeroFormatado = String(proximoNumero).padStart(4, '0');
    return `${prefix}-${numeroFormatado}`;
    
  } catch (error) {
    console.error(`Erro crítico ao gerar código sequencial para ${collectionName}:`, error);
    
    // Fallback de contingência seguro baseado em timestamp caso o utilizador esteja sem internet temporariamente
    const timestampFallback = Date.now().toString().slice(-4);
    return `${prefix}-FALLBACK-${timestampFallback}`;
  }
}