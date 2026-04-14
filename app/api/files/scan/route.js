/**
 * ============================================
 * WebfullSec — API: File Scan (Escanear diretório)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * POST /api/files/scan
 * Recebe um caminho de diretório e retorna listagem
 * de arquivos com metadados (nome, tamanho, tipo, etc.)
 */

import { NextResponse } from 'next/server';
import { scanDirectory } from '@/lib/file-organizer';

/**
 * POST — Escanear diretório
 * Body: { path: string, recursive?: boolean }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { path: dirPath, recursive = false } = body;

    // Validação do caminho
    if (!dirPath || typeof dirPath !== 'string') {
      return NextResponse.json(
        { error: 'Caminho do diretório é obrigatório.' },
        { status: 400 }
      );
    }

    // Escanear diretório
    const files = await scanDirectory(dirPath.trim(), recursive);

    // Estatísticas
    const stats = {
      totalFiles: files.length,
      supportedFiles: files.filter(f => f.isSupported).length,
      unsupportedFiles: files.filter(f => !f.isSupported).length,
      totalSize: files.reduce((acc, f) => acc + f.size, 0),
      extensions: [...new Set(files.map(f => f.extension))].sort(),
    };

    return NextResponse.json({ files, stats });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
