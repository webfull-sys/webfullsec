/**
 * ============================================
 * WebfullSec — File Organizer (Motor de Organização)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Motor principal do AI File Organizer:
 * - Escaneamento de diretórios
 * - Análise de conteúdo com IA (Gemini)
 * - Renomeação inteligente de arquivos
 * - Criação automática de pastas por categoria
 * - Detecção de duplicados via hash SHA-256
 * - 100% local (exceto chamadas ao Gemini)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { readFileContent, isSupportedExtension } from '@/lib/file-reader';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================
// Configuração do Gemini para análise de arquivos
// ============================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Obtém modelo Gemini para análise de arquivos
 * @returns {object} Instância do modelo
 */
function getAnalysisModel() {
  const modelName = process.env.AI_MODEL || 'gemini-2.0-flash';
  return genAI.getGenerativeModel({ model: modelName });
}

// ============================================
// Escaneamento de diretórios
// ============================================

/**
 * Escaneia um diretório e retorna lista de arquivos com metadados
 * @param {string} dirPath - Caminho absoluto do diretório
 * @param {boolean} recursive - Escanear subpastas (padrão: false)
 * @returns {Promise<object[]>} Lista de arquivos com metadados
 */
export async function scanDirectory(dirPath, recursive = false) {
  // Validação de segurança
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Diretório não encontrado: ${dirPath}`);
  }

  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    throw new Error(`O caminho não é um diretório: ${dirPath}`);
  }

  const files = [];

  /**
   * Função interna para listar arquivos
   * @param {string} currentPath - Caminho atual
   */
  function listFiles(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Ignorar pastas ocultas e de sistema
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '$RECYCLE.BIN') {
        continue;
      }

      if (entry.isFile()) {
        try {
          const fileStat = fs.statSync(fullPath);
          const ext = path.extname(entry.name).toLowerCase();

          files.push({
            name: entry.name,
            path: fullPath,
            relativePath: path.relative(dirPath, fullPath),
            extension: ext,
            size: fileStat.size,
            sizeFormatted: formatFileSize(fileStat.size),
            modifiedAt: fileStat.mtime.toISOString(),
            isSupported: isSupportedExtension(ext),
          });
        } catch {
          // Ignorar arquivos com erros de acesso
        }
      } else if (entry.isDirectory() && recursive) {
        listFiles(fullPath);
      }
    }
  }

  listFiles(dirPath);

  // Ordenar por nome
  files.sort((a, b) => a.name.localeCompare(b.name));

  return files;
}

// ============================================
// Análise com IA
// ============================================

/**
 * Analisa um arquivo com IA e sugere nome e categoria
 * @param {string} filePath - Caminho do arquivo
 * @param {string} extractedText - Texto já extraído do arquivo
 * @param {string} originalName - Nome original do arquivo
 * @returns {Promise<{suggestedName: string, category: string, confidence: number, description: string}>}
 */
export async function analyzeFileWithAI(filePath, extractedText, originalName) {
  const model = getAnalysisModel();
  const ext = path.extname(originalName);

  const prompt = `Você é um organizador de arquivos profissional. Analise o conteúdo abaixo e sugira:

1. Um **nome descritivo** para o arquivo (sem extensão, use underscores ao invés de espaços, máximo 60 caracteres, em português)
2. Uma **categoria** para organizar em pasta (uma palavra ou duas, sem acentos, ex: "Contratos", "Fotos_Projetos", "Notas_Fiscais", "Documentos_Pessoais", "Planilhas_Financeiras", "Apresentacoes", "Relatorios", "Manuais", "Imagens_Design", "Codigos_Fonte", "Videos", "Musicas", "Outros")
3. Um nível de **confiança** de 0 a 100 (quão seguro você está da classificação)
4. Uma **descrição** curta do conteúdo (máximo 100 caracteres)

**Arquivo original**: ${originalName}
**Extensão**: ${ext}
**Conteúdo extraído**:
${extractedText.substring(0, 3000)}

Responda EXATAMENTE neste formato JSON (sem markdown, sem código):
{"suggestedName": "nome_sugerido", "category": "Categoria", "confidence": 85, "description": "Descrição curta"}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Extrair JSON da resposta
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        suggestedName: sanitizeFileName(parsed.suggestedName || originalName.replace(ext, '')),
        category: sanitizeFileName(parsed.category || 'Outros'),
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
        description: (parsed.description || '').substring(0, 100),
      };
    }

    // Fallback se não conseguir parsear
    return {
      suggestedName: sanitizeFileName(originalName.replace(ext, '')),
      category: 'Outros',
      confidence: 30,
      description: 'Não foi possível analisar o conteúdo automaticamente.',
    };
  } catch (error) {
    console.error(`Erro na análise IA de ${originalName}:`, error.message);
    return {
      suggestedName: sanitizeFileName(originalName.replace(ext, '')),
      category: 'Outros',
      confidence: 0,
      description: `Erro na análise: ${error.message}`,
    };
  }
}

// ============================================
// Organização de arquivos
// ============================================

/**
 * Organiza arquivos: lê, analisa com IA, renomeia e move
 * @param {string} sourcePath - Pasta de origem
 * @param {string} destPath - Pasta de destino
 * @param {object[]} files - Lista de arquivos para processar
 * @param {function} onProgress - Callback de progresso (index, total, result)
 * @returns {Promise<object[]>} Resultados da organização
 */
export async function organizeFiles(sourcePath, destPath, files, onProgress = null) {
  const results = [];

  // Criar pasta de destino se não existir
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = {
      originalName: file.name,
      originalPath: file.path,
      newName: null,
      newPath: null,
      category: null,
      confidence: 0,
      description: '',
      status: 'pending',
      error: null,
    };

    try {
      // 1. Ler conteúdo do arquivo
      const content = await readFileContent(file.path);

      // 2. Analisar com IA
      const analysis = await analyzeFileWithAI(file.path, content.text, file.name);
      const ext = path.extname(file.name);
      const newFileName = `${analysis.suggestedName}${ext}`;

      // 3. Criar pasta de categoria
      const categoryPath = path.join(destPath, analysis.category);
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
      }

      // 4. Verificar se já existe um arquivo com mesmo nome no destino
      let finalName = newFileName;
      let finalPath = path.join(categoryPath, finalName);
      let counter = 1;

      while (fs.existsSync(finalPath)) {
        finalName = `${analysis.suggestedName}_${counter}${ext}`;
        finalPath = path.join(categoryPath, finalName);
        counter++;
      }

      // 5. Mover e renomear o arquivo
      fs.copyFileSync(file.path, finalPath);
      fs.unlinkSync(file.path);

      result.newName = finalName;
      result.newPath = finalPath;
      result.category = analysis.category;
      result.confidence = analysis.confidence;
      result.description = analysis.description;
      result.status = 'success';
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
    }

    results.push(result);

    // Notificar progresso
    if (onProgress) {
      onProgress(i + 1, files.length, result);
    }

    // Pequeno delay entre arquivos para respeitar rate limits da API
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

// ============================================
// Detecção de duplicados
// ============================================

/**
 * Calcula hash SHA-256 de um arquivo
 * @param {string} filePath - Caminho do arquivo
 * @returns {Promise<string>} Hash hexadecimal
 */
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Detecta arquivos duplicados em uma lista
 * @param {object[]} files - Lista de arquivos com path e size
 * @returns {Promise<object[]>} Grupos de duplicatas [{hash, files: [...]}]
 */
export async function detectDuplicates(files) {
  const hashMap = {};

  // Agrupar por tamanho primeiro (otimização)
  const sizeGroups = {};
  for (const file of files) {
    const key = file.size.toString();
    if (!sizeGroups[key]) sizeGroups[key] = [];
    sizeGroups[key].push(file);
  }

  // Calcular hash apenas dos que têm mesmo tamanho
  for (const [, group] of Object.entries(sizeGroups)) {
    if (group.length < 2) continue; // Sem duplicatas possíveis

    for (const file of group) {
      try {
        const hash = await calculateFileHash(file.path);
        if (!hashMap[hash]) hashMap[hash] = [];
        hashMap[hash].push(file);
      } catch {
        // Ignorar arquivos com erro de acesso
      }
    }
  }

  // Filtrar apenas grupos com 2+ arquivos (duplicatas reais)
  const duplicates = Object.entries(hashMap)
    .filter(([, group]) => group.length >= 2)
    .map(([hash, group]) => ({
      hash,
      count: group.length,
      size: group[0].size,
      sizeFormatted: formatFileSize(group[0].size),
      files: group.map(f => ({
        name: f.name,
        path: f.path,
        modifiedAt: f.modifiedAt,
      })),
    }));

  return duplicates;
}

/**
 * Move arquivos duplicados para pasta separada
 * @param {object[]} duplicateGroups - Grupos de duplicatas
 * @param {string} destPath - Pasta base de destino
 * @returns {Promise<object>} Resultado da movimentação
 */
export async function moveDuplicates(duplicateGroups, destPath) {
  const duplicatesFolder = path.join(destPath, '_Duplicados');
  if (!fs.existsSync(duplicatesFolder)) {
    fs.mkdirSync(duplicatesFolder, { recursive: true });
  }

  let moved = 0;
  let errors = 0;
  const details = [];

  for (const group of duplicateGroups) {
    // Manter o primeiro arquivo (mais antigo) e mover os demais
    const sorted = group.files.sort(
      (a, b) => new Date(a.modifiedAt) - new Date(b.modifiedAt)
    );
    const original = sorted[0];
    const duplicates = sorted.slice(1);

    for (const dup of duplicates) {
      try {
        const destFilePath = path.join(duplicatesFolder, dup.name);
        let finalPath = destFilePath;
        let counter = 1;

        // Evitar conflito de nomes
        while (fs.existsSync(finalPath)) {
          const ext = path.extname(dup.name);
          const base = dup.name.replace(ext, '');
          finalPath = path.join(duplicatesFolder, `${base}_dup${counter}${ext}`);
          counter++;
        }

        fs.copyFileSync(dup.path, finalPath);
        fs.unlinkSync(dup.path);
        moved++;

        details.push({
          original: original.name,
          duplicate: dup.name,
          movedTo: finalPath,
        });
      } catch (error) {
        errors++;
        details.push({
          duplicate: dup.name,
          error: error.message,
        });
      }
    }
  }

  return { moved, errors, duplicatesFolder, details };
}

// ============================================
// Utilitários
// ============================================

/**
 * Sanitiza nome de arquivo removendo caracteres inválidos
 * @param {string} name - Nome a sanitizar
 * @returns {string} Nome sanitizado
 */
function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Caracteres inválidos no Windows
    .replace(/\s+/g, '_')          // Espaços por underscores
    .replace(/_{2,}/g, '_')        // Múltiplos underscores
    .replace(/^[._]+/, '')         // Remover pontos/underscores no início
    .substring(0, 60)              // Limitar tamanho
    .trim();
}

/**
 * Formata tamanho de arquivo para exibição humana
 * @param {number} bytes - Tamanho em bytes
 * @returns {string} Tamanho formatado (ex: "1.5 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
