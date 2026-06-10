/**
 * veiculoService.js
 * Localização: src/services/veiculoService.js
 *
 * Funções Firestore para a gestão de viaturas e controlo de catálogo público.
 *
 * Todas as funções recebem `db` como primeiro argumento para seguir
 * o padrão de consistência já adotado no projeto.
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
    console.log("[veiculoService] A procurar todas as viaturas para o catálogo público...");
    const veiculosRef = collection(db, 'veiculos');
    const snap = await getDocs(veiculosRef);
    
    const listaViaturas = snap.docs.map(doc => {
      const dados = doc.data();
      return {
        id: doc.id,
        marca: dados.marca || '---',
        modelo: dados.modelo || '---',
        matricula: dados.matricula || '---',
        ano: dados.ano || '---',
        combustivel: dados.combustivel || '---',
        km: Number(dados.km || 0),
        // Se o campo anuncioAtivo não existir na base de dados, assume false por padrão
        anuncioAtivo: dados.anuncioAtivo ?? false,
        precoSemanal: Number(dados.precoSemanal || 0),
        cidade: dados.cidade || 'Lisboa'
      };
    });

    console.log(`[veiculoService] Encontradas ${listaViaturas.length} viaturas para o catálogo.`);
    return listaViaturas;
  } catch (error) {
    console.error("[veiculoService] Erro ao obter viaturas para catálogo:", error);
    throw error;
  }
};

/**
 * Altera o estado de ativação do anúncio público de uma viatura.
 * Atualiza o campo 'anuncioAtivo' no Firestore e regista um log na auditoria global do ERP.
 *
 * @param {Firestore} db
 * @param {string} veiculoId     - ID do documento da viatura no Firestore
 * @param {boolean} novoEstado   - true (para ativar anúncio) | false (para pausar anúncio)
 * @param {string} matricula     - Matrícula da viatura (para o texto do log de auditoria)
 * @param {string} alteradoPor   - Nome do gestor/admin que realizou a alteração
 * @returns {Promise<{ sucesso: boolean, msg: string }>}
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