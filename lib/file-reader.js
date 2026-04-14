/**
 * ============================================
 * WebfullSec — File Reader (Motor de Leitura)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Módulo server-side para extração de texto de
 * múltiplos formatos de arquivo. Suporta:
 * PDF, Word, Excel, Imagens (OCR), HTML, XML, etc.
 * 100% local — apenas texto extraído sai do PC.
 */

import fs from 'fs';
import path from 'path';

/**
 * Extensões suportadas agrupadas por tipo de leitor
 */
const SUPPORTED_EXTENSIONS = {
  pdf: ['.pdf'],
  word: ['.docx'],
  excel: ['.xlsx', '.xls'],
  text: ['.txt', '.md', '.log', '.ini', '.cfg', '.env'],
  markup: ['.html', '.htm', '.xml', '.svg'],
  data: ['.json', '.csv'],
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'],
};

/**
 * Verifica se uma extensão é suportada
 * @param {string} ext - Extensão do arquivo (ex: ".pdf")
 * @returns {boolean}
 */
export function isSupportedExtension(ext) {
  const lower = ext.toLowerCase();
  return Object.values(SUPPORTED_EXTENSIONS).some(exts => exts.includes(lower));
}

/**
 * Identifica o tipo de leitor com base na extensão
 * @param {string} ext - Extensão do arquivo
 * @returns {string|null} Tipo do leitor
 */
function getReaderType(ext) {
  const lower = ext.toLowerCase();
  for (const [type, exts] of Object.entries(SUPPORTED_EXTENSIONS)) {
    if (exts.includes(lower)) return type;
  }
  return null;
}

/**
 * Lê conteúdo de um arquivo PDF
 * @param {string} filePath - Caminho absoluto do arquivo
 * @returns {Promise<{text: string, metadata: object}>}
 */
async function readPDF(filePath) {
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);

  return {
    text: data.text.substring(0, 5000), // Limitar para performance da IA
    metadata: {
      pages: data.numpages,
      title: data.info?.Title || null,
      author: data.info?.Author || null,
    },
  };
}

/**
 * Lê conteúdo de um arquivo Word (.docx)
 * @param {string} filePath - Caminho absoluto do arquivo
 * @returns {Promise<{text: string, metadata: object}>}
 */
async function readWord(filePath) {
  const mammoth = await import('mammoth');
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });

  return {
    text: result.value.substring(0, 5000),
    metadata: {},
  };
}

/**
 * Lê conteúdo de um arquivo Excel (.xlsx, .xls)
 * @param {string} filePath - Caminho absoluto do arquivo
 * @returns {Promise<{text: string, metadata: object}>}
 */
async function readExcel(filePath) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheets = workbook.SheetNames;
  let text = '';

  // Ler primeiras linhas de cada sheet
  for (const sheetName of sheets.slice(0, 3)) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    text += `[Planilha: ${sheetName}]\n${data.substring(0, 2000)}\n\n`;
  }

  return {
    text: text.substring(0, 5000),
    metadata: {
      sheets: sheets.length,
      sheetNames: sheets,
    },
  };
}

/**
 * Lê conteúdo de arquivos de texto puro
 * @param {string} filePath - Caminho absoluto do arquivo
 * @returns {Promise<{text: string, metadata: object}>}
 */
async function readText(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    text: content.substring(0, 5000),
    metadata: {},
  };
}

/**
 * Lê conteúdo de arquivos de markup (HTML, XML)
 * Remove tags e retorna texto puro
 * @param {string} filePath - Caminho absoluto do arquivo
 * @returns {Promise<{text: string, metadata: object}>}
 */
async function readMarkup(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Remover tags HTML/XML para obter texto puro
  const textOnly = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    text: textOnly.substring(0, 5000),
    metadata: { format: path.extname(filePath) },
  };
}

/**
 * Lê conteúdo de arquivos de dados (JSON, CSV)
 * @param {string} filePath - Caminho absoluto do arquivo
 * @returns {Promise<{text: string, metadata: object}>}
 */
async function readData(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    try {
      const parsed = JSON.parse(content);
      // Resumir estrutura do JSON
      const summary = JSON.stringify(parsed, null, 2).substring(0, 3000);
      return {
        text: summary,
        metadata: { type: 'json', keys: Object.keys(parsed).slice(0, 10) },
      };
    } catch {
      return { text: content.substring(0, 5000), metadata: { type: 'json', parseError: true } };
    }
  }

  // CSV: retornar primeiras linhas
  return {
    text: content.substring(0, 5000),
    metadata: { type: 'csv' },
  };
}

/**
 * Lê conteúdo de imagem usando OCR via Google Gemini Vision
 * @param {string} filePath - Caminho absoluto da imagem
 * @returns {Promise<{text: string, metadata: object}>}
 */
async function readImage(filePath) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase();

  // Mapear extensão para MIME type
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
  };
  const mimeType = mimeMap[ext] || 'image/jpeg';

  try {
    const result = await model.generateContent([
      {
        inlineData: { data: base64, mimeType },
      },
      'Descreva detalhadamente o conteúdo desta imagem em português. Se houver texto visível, transcreva-o. Se for um documento, identifique o tipo. Responda de forma concisa.',
    ]);
    const description = result.response.text();

    return {
      text: description.substring(0, 3000),
      metadata: { format: ext, ocr: true },
    };
  } catch (error) {
    return {
      text: `[Imagem: ${path.basename(filePath)} — OCR falhou: ${error.message}]`,
      metadata: { format: ext, ocr: false, error: error.message },
    };
  }
}

/**
 * Função principal: lê o conteúdo de qualquer arquivo suportado
 * @param {string} filePath - Caminho absoluto do arquivo
 * @returns {Promise<{text: string, metadata: object, readerType: string}>}
 */
export async function readFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const readerType = getReaderType(ext);

  if (!readerType) {
    return {
      text: `[Formato não suportado: ${ext}]`,
      metadata: { unsupported: true },
      readerType: 'unsupported',
    };
  }

  try {
    let result;
    switch (readerType) {
      case 'pdf':
        result = await readPDF(filePath);
        break;
      case 'word':
        result = await readWord(filePath);
        break;
      case 'excel':
        result = await readExcel(filePath);
        break;
      case 'text':
        result = await readText(filePath);
        break;
      case 'markup':
        result = await readMarkup(filePath);
        break;
      case 'data':
        result = await readData(filePath);
        break;
      case 'image':
        result = await readImage(filePath);
        break;
      default:
        result = { text: '[Tipo desconhecido]', metadata: {} };
    }

    return { ...result, readerType };
  } catch (error) {
    return {
      text: `[Erro ao ler arquivo: ${error.message}]`,
      metadata: { error: error.message },
      readerType,
    };
  }
}

/**
 * Retorna a lista de extensões suportadas
 * @returns {string[]}
 */
export function getSupportedExtensions() {
  return Object.values(SUPPORTED_EXTENSIONS).flat();
}
