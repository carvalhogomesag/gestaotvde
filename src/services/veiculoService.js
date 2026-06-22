/**
 * veiculoService.js
 * Localização: src/services/veiculoService.js
 *
 * Funções Firestore para as coleções de frotas e controlo de anúncios:
 *   - obterViaturasParaCatalogo (Consulta pública com mapeamento de UX e fallbacks)
 *   - alternarEstadoAnuncioViatura (Ativação transacional com registo de log confidencial)
 */

import { 
  collection, getDocs, doc, 
  updateDoc, query, where, addDoc 
} from 'firebase/firestore';
import { logAcaoGlobal } from '../utils/logger';

/**
 * Obtém todas as viaturas registadas no sistema para alimentar o catálogo público.
 * Lê de forma simples toda a coleção "veiculos" para que o catálogo possa
 * mostrar tanto as viaturas disponíveis como as reservadas/indisponíveis.
 *
 * @param {Firestore} db
 * @returns {Promise<Array>}
 */
export const obterViaturasParaCatalogo = async (db) => {
  try {
    console.log("[veiculoService] A iniciar consulta de viaturas para o catálogo público...");
    const q = query(collection(db, 'veiculos'), where('anuncioAtivo', '==', true));
    const snap = await getDocs(q);
    
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        marca: data.marca || '',
        modelo: data.modelo || '',
        matricula: data.matricula || '',
        ano: data.ano || '---',
        dataPrimeiraMatricula: data.dataPrimeiraMatricula || '',
        cidade: data.cidade || 'Lisboa',
        combustivel: data.combustivel || 'Gasóleo',
        categoria: data.categoria || 'Standard',
        fotoUrl: data.fotoUrl || '',
        precoSemanal: Number(data.precoSemanal || 0),
        anuncioAtivo: data.anuncioAtivo ?? false,
        estado: data.estado || 'Disponível',
        // Propriedades técnicas para a ficha técnica do catálogo público
        transmissao: data.transmissao || 'Automática',
        autonomia: data.autonomia || 350,
        lugares: data.lugares || 5,
        ...data
      };
    });
  } catch (error) {
    console.error("[veiculoService] Erro ao obter viaturas:", error);
    return []; // Retorna array vazio em caso de erro, sem quebrar o componente público
  }
};

/**
 * Ativa ou pausa o anúncio de aluguer de uma viatura no catálogo.
 * Regista o log correspondente no histórico confidencial do ERP.
 * 
 * @param {Firestore} db 
 * @param {string} veiculoId 
 * @param {boolean} novoEstado 
 * @param {string} matricula 
 * @param {string} alteradoPor 
 * @returns {Promise<Object>}
 */
export const alternarEstadoAnuncioViatura = async (db, veiculoId, novoEstado, matricula, alteradoPor) => {
  try {
    console.log(`[veiculoService] A alterar estado do anúncio da viatura ${veiculoId} para: ${novoEstado}`);
    
    const veiculoRef = doc(db, 'veiculos', veiculoId);
    
    // Atualiza o documento no Firestore
    await updateDoc(veiculoRef, {
      anuncioAtivo: novoEstado,
      anuncioAtualizadoEm: new Date().toISOString()
    });

    // Regista na auditoria global (logs_sistema) para controlo de segurança
    const acaoDescricao = novoEstado 
      ? `Ativou o anúncio público da viatura (Matrícula: ${matricula}) no catálogo.`
      : `Pausou o anúncio público da viatura (Matrícula: ${matricula}) no catálogo.`;

    await logAcaoGlobal(
      alteradoPor,
      'Controlo de Catálogo',
      'Veículos',
      acaoDescricao,
      veiculoId
    );

    return {
      sucesso: true,
      msg: novoEstado 
        ? `O anúncio da viatura (${matricula}) foi ativado e já está visível para os visitantes.`
        : `O anúncio da viatura (${matricula}) foi pausado e ficará marcado como indisponível.`
    };

  } catch (error) {
    console.error("[veiculoService] Erro ao alternar estado do anúncio da viatura:", error);
    return {
      sucesso: false,
      msg: `Erro técnico ao atualizar o estado do anúncio: ${error.message}`
    };
  }
};