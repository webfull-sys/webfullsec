/**
 * ============================================
 * WebfullSec — API: File Status (Progresso do Job)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * GET /api/files/status?jobId=xxx
 * Retorna o status e progresso de um job de organização.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET — Consultar status do job
 * Query: jobId (obrigatório)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId é obrigatório.' },
        { status: 400 }
      );
    }

    const job = await prisma.fileOrganizeJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job não encontrado.' },
        { status: 404 }
      );
    }

    // Parsear resultados se disponíveis
    let results = [];
    if (job.results) {
      try {
        results = JSON.parse(job.results);
      } catch {
        results = [];
      }
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      sourcePath: job.sourcePath,
      destPath: job.destPath,
      totalFiles: job.totalFiles,
      processedFiles: job.processedFiles,
      duplicatesFound: job.duplicatesFound,
      progress: job.totalFiles > 0
        ? Math.round((job.processedFiles / job.totalFiles) * 100)
        : 0,
      results,
      errorLog: job.errorLog,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
