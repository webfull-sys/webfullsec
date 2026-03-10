/**
 * ============================================
 * WebfullSec — API: Tasks (CRUD completo)
 * GET  /api/tasks       — Lista tarefas com filtros
 * POST /api/tasks       — Cria nova tarefa
 * Autoria: Webfull (https://webfull.com.br)
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * GET /api/tasks
 * Query params: doDate, status, projectId, limit, offset
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const doDate = searchParams.get('doDate');
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtros dinamicamente
    const where = {};

    if (doDate === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.doDate = { gte: today, lt: tomorrow };
    } else if (doDate) {
      const date = new Date(doDate);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.doDate = { gte: date, lt: nextDay };
    }

    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, title: true, category: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { position: 'asc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.task.count({ where }),
    ]);

    return apiResponse({ tasks, total, limit, offset });
  } catch (error) {
    console.error('Erro ao listar tarefas:', error);
    return apiError('Erro ao listar tarefas', 500);
  }
}

/**
 * POST /api/tasks
 * Body: { title, description, priority, estimatedTime, doDate, dueDate, projectId, parentId }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, priority, estimatedTime, doDate, dueDate, projectId, parentId } = body;

    if (!title?.trim()) {
      return apiError('O título da tarefa é obrigatório', 400);
    }

    // Buscar próxima posição
    const maxPos = await prisma.task.aggregate({
      _max: { position: true },
      where: { projectId: projectId || undefined },
    });

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 2,
        estimatedTime: estimatedTime || null,
        doDate: doDate ? new Date(doDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId || null,
        parentId: parentId || null,
        position: (maxPos._max.position || 0) + 1,
      },
      include: {
        project: { select: { id: true, title: true } },
      },
    });

    return apiResponse(task, 201);
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    return apiError('Erro ao criar tarefa', 500);
  }
}
