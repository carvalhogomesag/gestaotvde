import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurações
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NOME_ARQUIVO_SAIDA = 'PROJETO_COMPLETO_CONTEXTO.txt';

// Pastas e arquivos que NÃO devem ser incluídos
const EXCLUSOES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.env', // Segurança: nunca exportar suas chaves reais
  'package-lock.json',
  'PROJETO_COMPLETO_CONTEXTO.txt',
  '.DS_Store',
  'public' // Geralmente contém apenas ícones e imagens
];

// Extensões de arquivos que queremos capturar
const EXTENSOES_PERMITIDAS = ['.js', '.jsx', '.css', '.html', '.json'];

let conteudoFinal = "ESTRUTURA DO PROJETO E CÓDIGO FONTE\n";
conteudoFinal += "====================================\n\n";

function percorrerDiretorio(diretorioAtual) {
  const arquivos = fs.readdirSync(diretorioAtual);

  arquivos.forEach(arquivo => {
    const caminhoCompleto = path.join(diretorioAtual, arquivo);
    const estatisticas = fs.statSync(caminhoCompleto);

    // Verifica se está na lista de exclusão
    if (EXCLUSOES.includes(arquivo)) return;

    if (estatisticas.isDirectory()) {
      percorrerDiretorio(caminhoCompleto);
    } else {
      const extensao = path.extname(arquivo);
      if (EXTENSOES_PERMITIDAS.includes(extensao)) {
        const caminhoRelativo = path.relative(__dirname, caminhoCompleto);
        const conteudo = fs.readFileSync(caminhoCompleto, 'utf8');

        conteudoFinal += `\n\n### ARQUIVO: ${caminhoRelativo} ###\n`;
        conteudoFinal += "--------------------------------------------------\n";
        conteudoFinal += conteudo;
        conteudoFinal += "\n--------------------------------------------------\n";
      }
    }
  });
}

console.log("🚀 Iniciando exportação do código...");

try {
  percorrerDiretorio(__dirname);
  fs.writeFileSync(NOME_ARQUIVO_SAIDA, conteudoFinal);
  console.log(`✅ Sucesso! O arquivo ${NOME_ARQUIVO_SAIDA} foi criado na raiz do projeto.`);
  console.log("💡 Agora basta copiar o conteúdo deste arquivo para o novo chat da IA.");
} catch (error) {
  console.error("❌ Erro ao exportar:", error);
}