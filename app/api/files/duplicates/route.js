/**
 * ============================================
 * WebfullSec — API: File Duplicates (Detectar Duplicados)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * POST /api/files/duplicates
 * Escaneia um diretório e detecta arquivos duplicados
 * via hash SHA-256. Opcionalmente move para pasta separada.
 */

import { NextResponse } from 'next/server';
import { scanDirectory, detectDuplicates, moveDuplicates } from '@/lib/file-organizer';

/**
 * POST — Detectar e opcionalmente mover duplicados
 * Body: { path: string, move?: boolean, destPath?: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { path: dirPath, move = false, destPath = null } = body;

    // Validação
    if (!dirPath || typeof dirPath !== 'string') {
      return NextResponse.json(
        { error: 'Caminho do diretório é obrigatório.' },
        { status: 400 }
      );
    }

    // Escanear diretório
    const files = await scanDirectory(dirPath.trim());

    // Detectar duplicados
    const duplicates = await detectDuplicates(files);

    // Se solicitado, mover os duplicados
    let moveResult = null;
    if (move && duplicates.length > 0) {
      const target = destPath || dirPath.trim();
      moveResult = await moveDuplicates(duplicates, target);
    }

    // Estatísticas
    const totalDuplicateFiles = duplicates.reduce((acc, g) => acc + g.count - 1, 0);
    const totalDuplicateSpace = duplicates.reduce(
      (acc, g) => acc + g.size * (g.count - 1), 0
    );

    return NextResponse.json({
      duplicateGroups: duplicates.length,
      totalDuplicateFiles,
      totalDuplicateSpace,
      duplicates,
      moveResult,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
