/**
 * ============================================
 * WebfullSec — API: File Organize (Organizar com IA)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * POST /api/files/organize
 * Inicia um job de organização de arquivos com IA.
 * Os arquivos são lidos, analisados, renomeados e
 * movidos para pastas categorizadas automaticamente.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { scanDirectory, organizeFiles } from '@/lib/file-organizer';

/**
 * POST — Iniciar organização de arquivos
 * Body: { sourcePath: string, destPath: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { sourcePath, destPath } = body;

    // Validações
    if (!sourcePath || !destPath) {
      return NextResponse.json(
        { error: 'sourcePath e destPath são obrigatórios.' },
        { status: 400 }
      );
    }

    // Escanear o diretório de origem
    const allFiles = await scanDirectory(sourcePath.trim());
    const supportedFiles = allFiles.filter(f => f.isSupported);

    if (supportedFiles.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum arquivo suportado encontrado no diretório.' },
        { status: 400 }
      );
    }

    // Criar registro do job no banco
    const job = await prisma.fileOrganizeJob.create({
      data: {
        sourcePath: sourcePath.trim(),
        destPath: destPath.trim(),
        mode: 'ai',
        totalFiles: supportedFiles.length,
        processedFiles: 0,
        status: 'running',
        startedAt: new Date(),
      },
    });

    // Processar em background (não bloquear a resposta)
    processJob(job.id, sourcePath.trim(), destPath.trim(), supportedFiles);

    return NextResponse.json({
      jobId: job.id,
      totalFiles: supportedFiles.length,
      message: `Organização iniciada para ${supportedFiles.length} arquivos.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Processa o job de organização em background
 * Atualiza o progresso no banco de dados
 * @param {string} jobId - ID do job
 * @param {string} sourcePath - Caminho de origem
 * @param {string} destPath - Caminho de destino
 * @param {object[]} files - Arquivos a processar
 */
async function processJob(jobId, sourcePath, destPath, files) {
  try {
    const results = await organizeFiles(sourcePath, destPath, files, async (processed, total, result) => {
      // Atualizar progresso no banco
      try {
        await prisma.fileOrganizeJob.update({
          where: { id: jobId },
          data: { processedFiles: processed },
        });
      } catch {
        // Continuar mesmo se falhar a atualização de progresso
      }
    });

    // Finalizar job
    await prisma.fileOrganizeJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        processedFiles: files.length,
        results: JSON.stringify(results),
        completedAt: new Date(),
      },
    });
  } catch (error) {
    // Marcar job como falho
    await prisma.fileOrganizeJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorLog: error.message,
        completedAt: new Date(),
      },
    });
  }
}
