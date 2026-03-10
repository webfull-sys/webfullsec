/**
 * ============================================
 * WebfullSec — API: Memories / Logs de Memória
 * GET  /api/memories — Lista memórias por projeto
 * POST /api/memories — Cria nova memória
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.2.0
 * ============================================
 * Rastreador de "Onde eu parei?" — logs de progresso,
 * decisões, bloqueios e marcos vinculados a projetos.
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * GET /api/memories
 * Query params: projectId (obrigatório), taskId, type, limit
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const taskId = searchParams.get('taskId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!projectId) {
      return apiError('O projectId é obrigatório', 400);
    }

    // Construir filtros
    const where = { projectId };
    if (taskId) where.taskId = taskId;
    if (type) where.type = type;

    const [memories, total] = await Promise.all([
      prisma.memory.findMany({
        where,
        include: {
          task: { select: { id: true, title: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.memory.count({ where }),
    ]);

    return apiResponse({ memories, total });
  } catch (error) {
    console.error('Erro ao listar memórias:', error);
    return apiError('Erro ao listar memórias', 500);
  }
}

/**
 * POST /api/memories
 * Body: { content, type, projectId, taskId }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { content, type, projectId, taskId } = body;

    if (!content?.trim()) {
      return apiError('O conteúdo da memória é obrigatório', 400);
    }

    if (!projectId) {
      return apiError('O projectId é obrigatório', 400);
    }

    // Validar que o projeto existe
    const projectExists = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!projectExists) {
      return apiError('Projeto não encontrado', 404);
    }

    const memory = await prisma.memory.create({
      data: {
        content: content.trim(),
        type: type || 'progress',
        projectId,
        taskId: taskId || null,
      },
      include: {
        project: { select: { id: true, title: true } },
        task: { select: { id: true, title: true } },
      },
    });

    return apiResponse(memory, 201);
  } catch (error) {
    console.error('Erro ao criar memória:', error);
    return apiError('Erro ao criar memória', 500);
  }
}
