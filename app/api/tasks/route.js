/**
 * ============================================
 * WebfullSec — API: Tasks (CRUD completo)
 * GET  /api/tasks — Lista tarefas com filtros
 * POST /api/tasks — Cria nova tarefa
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.2.0
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * GET /api/tasks
 * Query params: doDate, dueDate, status, projectId, priority, limit, offset
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const doDate = searchParams.get('doDate');
    const dueDate = searchParams.get('dueDate');
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');
    const priority = searchParams.get('priority');
    const overdue = searchParams.get('overdue');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtros dinamicamente
    const where = {};

    // Filtro por doDate (data de execução)
    if (doDate === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.doDate = { gte: today, lt: tomorrow };
    } else if (doDate === 'week') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      where.doDate = { gte: today, lt: nextWeek };
    } else if (doDate) {
      const date = new Date(doDate);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.doDate = { gte: date, lt: nextDay };
    }

    // Filtro por dueDate (prazo limite)
    if (dueDate === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.dueDate = { gte: today, lt: tomorrow };
    } else if (dueDate) {
      const date = new Date(dueDate);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.dueDate = { gte: date, lt: nextDay };
    }

    // Filtro por tarefas atrasadas
    if (overdue === 'true') {
      const now = new Date();
      where.dueDate = { lt: now };
      where.status = { notIn: ['done', 'cancelled'] };
    }

    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (priority) where.priority = parseInt(priority);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, title: true, category: true, status: true } },
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
 * Body: { title, description, priority, estimatedTime, doDate, dueDate,
 *         projectId, parentId, tags, recurrence, status }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title, description, priority, estimatedTime,
      doDate, dueDate, projectId, parentId,
      tags, recurrence, status,
    } = body;

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
        status: status || 'inbox', // Default: inbox (funil de captura)
        priority: priority || 2,
        estimatedTime: estimatedTime || null,
        doDate: doDate ? new Date(doDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId || null,
        parentId: parentId || null,
        tags: tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
        recurrence: recurrence || null,
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
